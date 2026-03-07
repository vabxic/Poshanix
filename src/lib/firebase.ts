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

// Saved food analyses
export const saveFoodAnalysis = async (userId: string, analysis: Record<string, unknown>) => {
  const colRef = collection(db, 'profiles', userId, 'saved_analyses')
  const docRef = await addDoc(colRef, {
    ...analysis,
    saved_at: Timestamp.now(),
  })
  return docRef.id
}

export const getSavedAnalyses = async (userId: string) => {
  const colRef = collection(db, 'profiles', userId, 'saved_analyses')
  const q = query(colRef, orderBy('saved_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const deleteSavedAnalysis = async (userId: string, analysisId: string) => {
  await deleteDoc(doc(db, 'profiles', userId, 'saved_analyses', analysisId))
}

export type { User }
