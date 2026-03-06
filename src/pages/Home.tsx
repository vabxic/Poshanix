import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange, signOutUser, getProfile } from '../lib/firebase'
import { useTheme } from '../lib/useTheme'
import ThemeSwitch from '../components/Switch'
import Loader from '../components/loader'
import LoaderOcr from '../components/loader-ocr'
import ChatWidget from '../components/ChatWidget'
import './Home.css'
import { createWorker } from 'tesseract.js'

const TIPS = [
  "Drinking water before meals can help with portion control and hydration.",
  "Colourful plates = more nutrients. Aim for 3+ colours per meal.",
  "Reading nutrition labels helps you make smarter choices — that's why you're here!",
  "A 10-minute walk after lunch can improve digestion and blood sugar levels.",
  "Protein-rich breakfasts keep you fuller longer and reduce snacking.",
  "Fibre slows sugar absorption — great for steady energy through the day.",
  "Eating slowly gives your brain time to register fullness (about 20 min).",
  "Fermented foods like yoghurt support a healthy gut microbiome.",
]

function Home() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [healthMetrics, setHealthMetrics] = useState<{ bmi: number | null; bmr: number | null }>({ bmi: null, bmr: null })
  const [showScanner, setShowScanner] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [aiResponse, setAiResponse] = useState('')
  const [ocrSentToAi, setOcrSentToAi] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const dailyTip = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % TIPS.length
    return TIPS[dayIndex]
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      if (!currentUser) { navigate('/auth'); return }
      setUser(currentUser)
      
      try {
        const p = await getProfile(currentUser.uid)
        if (p) {
          setProfile(p)
          setHealthMetrics({ bmi: p.bmi ?? null, bmr: p.bmr ?? null })
        }
      } catch (err) {
        console.warn('Could not load profile:', err)
      }
      
      setLoading(false)
    })
    return () => unsubscribe()
  }, [navigate])

  const API_BASE = (import.meta.env.VITE_AI_API_BASE as string) || 'https://poshanix.onrender.com'

  // when OCR text appears, send it to the AI endpoint once
  useEffect(() => {
    if (!ocrText || ocrLoading) return
    if (ocrSentToAi) return
    // Navigate immediately to the Food page with the raw OCR text; Food page will request AI parsing
    setOcrSentToAi(true)
    const parsed = {
      cleaned_text: ocrText,
      nutrition_facts: {},
      ingredients: null,
      medical_nutrition_advice: []
    }
    setShowScanner(false)
    setImageSrc(null)
    setOcrText('')
    // pass any existing aiResponse along so Food page can display AI insight immediately
    navigate('/food', { state: { parsed, ai_insight: aiResponse } })
  }, [ocrText, ocrLoading, ocrSentToAi, aiResponse])

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/auth')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </div>
    )
  }

  // Firebase user object has displayName and photoURL directly
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'there'
  const avatar = user?.photoURL
  const initials = displayName.slice(0, 2).toUpperCase()

  const hour = currentTime.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  const bmiCategory = healthMetrics.bmi
    ? healthMetrics.bmi < 18.5 ? 'Underweight'
      : healthMetrics.bmi < 25 ? 'Normal'
      : healthMetrics.bmi < 30 ? 'Overweight' : 'Obese'
    : null

  const bmiColor = healthMetrics.bmi
    ? healthMetrics.bmi < 18.5 ? '#60a5fa'
      : healthMetrics.bmi < 25 ? '#4ade80'
      : healthMetrics.bmi < 30 ? '#fbbf24' : '#ef4444'
    : undefined

  return (
    <div className="home-page">
      {/* Nav */}
      <nav className="nav home-nav">
        <span className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          &#x1F33F; Poshanix
        </span>
        <div className="home-nav-right">
          <ThemeSwitch checked={theme === 'dark'} onToggle={toggleTheme} />
          <div className="avatar-wrap" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Edit profile">
            {avatar
              ? <img src={avatar} className="user-avatar" alt="avatar" />
              : <div className="avatar-initials">{initials}</div>}
          </div>
          <span className="user-display-name">{displayName}</span>
          <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      {/* Main */}
      <main className="home-main">

        {/* Hero welcome */}
        <section className="home-hero-section">
          <div className="home-hero-text">
            <span className="home-date-badge">{dateStr}</span>
            <h1 className="home-title">
              {greeting}, <span className="accent">{displayName}</span> <span className="wave">👋</span>
            </h1>
            <p className="home-sub">
              Your AI-powered nutrition companion is ready. Scan food labels, track your health, and eat smarter.
            </p>
          </div>
          <div className="home-hero-clock">
            <span className="clock-time">{timeStr}</span>
            <span className="clock-label">Current Time</span>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="quick-stats-row">
          <div className="quick-stat-card">
            <div className="quick-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{profile?.age ?? '—'}</span>
              <span className="quick-stat-label">Age</span>
            </div>
          </div>
          <div className="quick-stat-card">
            <div className="quick-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{profile?.weight ? `${profile.weight} ${profile.weight_unit || 'kg'}` : '—'}</span>
              <span className="quick-stat-label">Weight</span>
            </div>
          </div>
          <div className="quick-stat-card">
            <div className="quick-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{profile?.water_intake || '—'}</span>
              <span className="quick-stat-label">Water Intake</span>
            </div>
          </div>
          <div className="quick-stat-card">
            <div className="quick-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            </div>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{profile?.eating_habits?.replace(/_/g, ' ') || '—'}</span>
              <span className="quick-stat-label">Eating Habits</span>
            </div>
          </div>
        </section>

        {/* Health Metrics */}
        {(healthMetrics.bmi !== null || healthMetrics.bmr !== null) && (
          <section className="health-metrics-section">
            <h2 className="section-heading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Health Metrics
            </h2>
            <div className="health-metrics-grid">
              {healthMetrics.bmi !== null && (
                <div className="metric-card-home">
                  <div className="metric-card-header">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bar%20Chart.png" alt="Bar Chart" width={40} height={40} />
                    <span className="metric-badge" style={{ background: bmiColor, color: '#000' }}>{bmiCategory}</span>
                  </div>
                  <div className="metric-info-home">
                    <div className="metric-label-home">Body Mass Index</div>
                    <div className="metric-value-home">{healthMetrics.bmi}</div>
                    <div className="metric-bar-track">
                      <div className="metric-bar-fill" style={{ width: `${Math.min((healthMetrics.bmi / 40) * 100, 100)}%`, background: bmiColor }} />
                    </div>
                    <div className="metric-range-labels"><span>0</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div>
                  </div>
                </div>
              )}
              {healthMetrics.bmr !== null && (
                <div className="metric-card-home">
                  <div className="metric-card-header">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Fire.png" alt="Fire" width={40} height={40} />
                    <span className="metric-badge metric-badge-fire">Daily Burn</span>
                  </div>
                  <div className="metric-info-home">
                    <div className="metric-label-home">Basal Metabolic Rate</div>
                    <div className="metric-value-home">{healthMetrics.bmr} <span className="metric-unit">kcal/day</span></div>
                    <div className="metric-bar-track">
                      <div className="metric-bar-fill metric-bar-bmr" style={{ width: `${Math.min((healthMetrics.bmr / 3000) * 100, 100)}%` }} />
                    </div>
                    <div className="metric-range-labels"><span>0</span><span>1000</span><span>2000</span><span>3000</span></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tip of the day */}
        <section className="tip-section">
          <div className="tip-card">
            <div className="tip-icon">💡</div>
            <div className="tip-content">
              <span className="tip-label">Tip of the Day</span>
              <p className="tip-text">{dailyTip}</p>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="features-section">
          <h2 className="section-heading">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Features
          </h2>
          <div className="feature-grid">
            <div className="feature-card feature-highlight" onClick={() => setShowScanner(true)} style={{ cursor: 'pointer' }}>
              <div className="feature-card-top">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Camera%20with%20Flash.png" alt="Camera with Flash" width="48" height="48" />
                <span className="feature-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </span>
              </div>
              <h3>Scan Food</h3>
              <p>Snap a photo of any nutrition label and get instant AI-powered insights.</p>
              <span className="action-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Start scanning
              </span>
            </div>

            <div className="feature-card" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
              <div className="feature-card-top">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Bust%20in%20Silhouette.png" alt="Profile" width="48" height="48" />
                <span className="feature-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </span>
              </div>
              <h3>Your Profile</h3>
              <p>View and update your health data, weight, goals, and medical history.</p>
              <span className="action-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                Edit profile
              </span>
            </div>

            <div className="feature-card feature-disabled">
              <div className="feature-card-top">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Green%20Salad.png" alt="Nutrition Log" width="48" height="48" />
              </div>
              <h3>Nutrition Log</h3>
              <p>Track your daily intake and monitor macro goals over time.</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>

            <div className="feature-card feature-disabled">
              <div className="feature-card-top">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Bullseye.png" alt="Goals" width="48" height="48" />
              </div>
              <h3>Goals</h3>
              <p>Set personalized calorie and macro targets tailored just for you.</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>
        </section>

      </main>

      {showScanner && (
        <div className="scanner-backdrop" onClick={() => setShowScanner(false)}>
          <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
            <header className="scanner-header">
              <h3>Scan Food (OCR)</h3>
              <button className="link-btn" onClick={() => { setShowScanner(false); setImageSrc(null); setOcrText(''); setOcrSentToAi(false); setOcrProgress(0); }}>Close</button>
            </header>

            <div className="scanner-body">
              <div className="scanner-controls">
                <input type="file" accept="image/*" id="scanner-file" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const url = URL.createObjectURL(file)
                  setImageSrc(url)
                  setOcrText('')
                    setOcrSentToAi(false)
                  // run OCR using the File object (more reliable than passing the object URL)
                  setOcrLoading(true)
                  setOcrProgress(0)
                  const worker = await createWorker()
                  try {
                    // createWorker resolves after loading & initializing languages, so we can call recognize directly
                    const { data } = await worker.recognize(file)
                    console.log('Tesseract result', data)
                    const text = (data && data.text) ? data.text.trim() : ''
                    setOcrText(text || 'No text recognized — try a clearer photo or different lighting.')
                  } catch (err) {
                    console.error('OCR error', err)
                    setOcrText('OCR failed: ' + ((err as any)?.message ?? String(err)))
                  } finally {
                    setOcrLoading(false)
                    setOcrProgress(100)
                    await worker.terminate()
                    try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
                  }
                }} />
                <label className="primary-btn" htmlFor="scanner-file">Upload / Capture Image</label>
                <button className="primary-btn" onClick={async () => {
                  const isMobile = /(Mobi|Android|iPhone|iPad|iPod)/i.test(navigator.userAgent) || (navigator as any).maxTouchPoints > 0
                  if (isMobile) {
                    // On mobile, prefer the native file input with back camera
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    // request back camera on mobile
                    input.capture = 'environment'
                    input.onchange = async (ev: any) => {
                      const file = ev.target.files?.[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      setImageSrc(url)
                      setOcrText('')
                        setOcrSentToAi(false)
                      setOcrLoading(true)
                      setOcrProgress(0)
                      const worker = await createWorker()
                      try {
                        const { data } = await worker.recognize(file)
                        const text = (data && data.text) ? data.text.trim() : ''
                        setOcrText(text || 'No text recognized — try a clearer photo or different lighting.')
                      } catch (err) {
                        console.error('OCR error', err)
                        setOcrText('OCR failed: ' + ((err as any)?.message ?? String(err)))
                      } finally {
                        setOcrLoading(false)
                        setOcrProgress(100)
                        await worker.terminate()
                        try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
                      }
                    }
                    input.click()
                  } else {
                    // On desktop, open camera via getUserMedia and use front camera
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                      setCameraStream(stream)
                      setCameraActive(true)
                      // attach stream to video element when available
                      setTimeout(() => {
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream
                          videoRef.current.play().catch(() => {})
                        }
                      }, 50)
                    } catch (err) {
                      console.error('Camera open failed', err)
                      // fallback to file input if getUserMedia fails
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = async (ev: any) => {
                        const file = ev.target.files?.[0]
                        if (!file) return
                        const url = URL.createObjectURL(file)
                        setImageSrc(url)
                        setOcrText('')
                          setOcrSentToAi(false)
                        setOcrLoading(true)
                        setOcrProgress(0)
                        const worker = await createWorker()
                        try {
                          const { data } = await worker.recognize(file)
                          const text = (data && data.text) ? data.text.trim() : ''
                          setOcrText(text || 'No text recognized — try a clearer photo or different lighting.')
                        } catch (err) {
                          console.error('OCR error', err)
                          setOcrText('OCR failed: ' + ((err as any)?.message ?? String(err)))
                        } finally {
                          setOcrLoading(false)
                          setOcrProgress(100)
                          await worker.terminate()
                          try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
                        }
                      }
                      input.click()
                    }
                  }
                }}>Use Camera</button>
              </div>

              <div className="scanner-result">
                {imageSrc && <img src={imageSrc} alt="preview" className="ocr-preview" />}
                {cameraActive && (
                  <div className="camera-preview">
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div style={{ marginTop: 8 }}>
                      <button className="primary-btn" onClick={async () => {
                        if (!videoRef.current) return
                        const video = videoRef.current
                        const canvas = document.createElement('canvas')
                        canvas.width = video.videoWidth || 1280
                        canvas.height = video.videoHeight || 720
                        const ctx = canvas.getContext('2d')
                        if (!ctx) return
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        canvas.toBlob(async (blob) => {
                          if (!blob) return
                          const file = new File([blob], 'capture.jpg', { type: blob.type })
                          const url = URL.createObjectURL(file)
                          setImageSrc(url)
                          setOcrText('')
                            setOcrSentToAi(false)
                          setOcrLoading(true)
                          setOcrProgress(0)
                          // stop camera
                          try { cameraStream?.getTracks().forEach(t => t.stop()) } catch (e) { /* ignore */ }
                          setCameraActive(false)
                          setCameraStream(null)
                          const worker = await createWorker()
                          try {
                            const { data } = await worker.recognize(file)
                            const text = (data && data.text) ? data.text.trim() : ''
                            setOcrText(text || 'No text recognized — try a clearer photo or different lighting.')
                          } catch (err) {
                            console.error('OCR error', err)
                            setOcrText('OCR failed: ' + ((err as any)?.message ?? String(err)))
                          } finally {
                            setOcrLoading(false)
                            setOcrProgress(100)
                            await worker.terminate()
                            try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
                          }
                        }, 'image/jpeg')
                      }}>Capture</button>
                      <button className="link-btn" onClick={() => {
                        try { cameraStream?.getTracks().forEach(t => t.stop()) } catch (e) { /* ignore */ }
                        setCameraActive(false)
                        setCameraStream(null)
                      }}>Close Camera</button>
                    </div>
                  </div>
                )}
                    {ocrLoading && <div className="progress-bar"><div className="progress-fill" style={{ width: `${ocrProgress}%` }} /></div>}
                    {ocrLoading && (
                      <div className="scanner-loading-overlay" onClick={(e) => e.stopPropagation()}>
                        <LoaderOcr />
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ChatWidget />
    </div>
  )
}

export default Home
