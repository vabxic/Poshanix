import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc, Timestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

type SavedAnalysisRecord = Record<string, unknown> & {
  id: string
  saved_at: Timestamp | string
}

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Auth providers
const googleProvider = new GoogleAuthProvider()
const githubProvider = new GithubAuthProvider()

// Auth functions
export const signInWithPassword = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUp = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  // Create profile document in Firestore
  await setDoc(doc(db, 'profiles', userCredential.user.uid), {
    id: userCredential.user.uid,
    email: userCredential.user.email,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  })
  return userCredential
}

export const signOutUser = () => signOut(auth)

export const sendMagicLink = (email: string, redirectUrl: string) =>
  sendSignInLinkToEmail(auth, email, {
    url: redirectUrl,
    handleCodeInApp: true,
  })

export const completeMagicLinkSignIn = async (email: string, url: string) => {
  if (isSignInWithEmailLink(auth, url)) {
    const result = await signInWithEmailLink(auth, email, url)
    // Create profile if it doesn't exist
    const profileRef = doc(db, 'profiles', result.user.uid)
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        id: result.user.uid,
        email: result.user.email,
        onboarding_completed: false,
        created_at: new Date().toISOString(),
      })
    }
    return result
  }
  return null
}

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signInWithGithub = () => signInWithPopup(auth, githubProvider)

// Returns a human-readable list of sign-in methods already registered for an email
export const getSignInMethodsForEmail = (email: string) =>
  fetchSignInMethodsForEmail(auth, email)

// Profile functions
export const getProfile = async (userId: string) => {
  const profileRef = doc(db, 'profiles', userId)
  const profileSnap = await getDoc(profileRef)
  return profileSnap.exists() ? profileSnap.data() : null
}

export const updateProfile = async (userId: string, data: Record<string, unknown>) => {
  const profileRef = doc(db, 'profiles', userId)
  const profileSnap = await getDoc(profileRef)
  if (profileSnap.exists()) {
    await updateDoc(profileRef, data)
  } else {
    await setDoc(profileRef, { id: userId, ...data })
  }
}

// Storage functions
export const uploadFile = async (path: string, file: File) => {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

// Auth state observer
export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback)

export const getCurrentUser = () => auth.currentUser

const isPermissionDeniedError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'permission-denied'

const getProfileRef = (userId: string) => doc(db, 'profiles', userId)

const generateSavedAnalysisId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `saved-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const getEmbeddedSavedAnalyses = async (userId: string): Promise<SavedAnalysisRecord[]> => {
  const profileSnap = await getDoc(getProfileRef(userId))
  const savedAnalyses = profileSnap.data()?.saved_analyses
  return Array.isArray(savedAnalyses) ? (savedAnalyses as SavedAnalysisRecord[]) : []
}

const sortSavedAnalyses = <T extends { saved_at?: Timestamp | string | null }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = left.saved_at instanceof Timestamp
      ? left.saved_at.toMillis()
      : left.saved_at
        ? new Date(left.saved_at).getTime()
        : 0
    const rightTime = right.saved_at instanceof Timestamp
      ? right.saved_at.toMillis()
      : right.saved_at
        ? new Date(right.saved_at).getTime()
        : 0
    return rightTime - leftTime
  })

// Saved food analyses
export const saveFoodAnalysis = async (userId: string, analysis: Record<string, unknown>) => {
  const colRef = collection(db, 'profiles', userId, 'saved_analyses')
  try {
    const docRef = await addDoc(colRef, {
      ...analysis,
      saved_at: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    if (!isPermissionDeniedError(error)) throw error

    const savedAnalysis: SavedAnalysisRecord = {
      id: generateSavedAnalysisId(),
      ...analysis,
      saved_at: new Date().toISOString(),
    }
    const existing = await getEmbeddedSavedAnalyses(userId)
    await setDoc(getProfileRef(userId), {
      id: userId,
      saved_analyses: [...existing, savedAnalysis],
    }, { merge: true })
    return savedAnalysis.id
  }
}

export const getSavedAnalyses = async (userId: string) => {
  const colRef = collection(db, 'profiles', userId, 'saved_analyses')
  try {
    const q = query(colRef, orderBy('saved_at', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    if (!isPermissionDeniedError(error)) throw error
    return sortSavedAnalyses(await getEmbeddedSavedAnalyses(userId))
  }
}

export const deleteSavedAnalysis = async (userId: string, analysisId: string) => {
  try {
    await deleteDoc(doc(db, 'profiles', userId, 'saved_analyses', analysisId))
  } catch (error) {
    if (!isPermissionDeniedError(error)) throw error
    const existing = await getEmbeddedSavedAnalyses(userId)
    await setDoc(getProfileRef(userId), {
      id: userId,
      saved_analyses: existing.filter(analysis => analysis.id !== analysisId),
    }, { merge: true })
  }
}

export type { User }
