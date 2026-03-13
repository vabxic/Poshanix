import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Food from './pages/Food'
import Profile from './pages/Profile'
import Onboarding from './pages/Onboarding'
import Privacy from './legal/Privacy'
import Terms from './legal/Terms'
import { useTheme } from './lib/useTheme'
import GitButton from './component/git_button'
import ThemeSwitch from './components/Switch'
import Carousel, { type CarouselItem } from './component/Carousel'
import RotatingText from './component/RotatingText'
import Button from './component/button'
import './App.css'

function Landing() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const featureItems: CarouselItem[] = [
    {
      id: 1,
      icon: <span className="feature-carousel-emoji">📸</span>,
      title: 'Scan Any Label',
      description: 'Point your camera at any nutrition label, packaged food, restaurant menus, or upload a photo.'
    },
    {
      id: 2,
      icon: <span className="feature-carousel-emoji">🤖</span>,
      title: 'AI Interpretation',
      description: 'Our AI instantly reads, extracts, and interprets full nutritional data with remarkable accuracy.'
    },
    {
      id: 3,
      icon: <span className="feature-carousel-emoji">📊</span>,
      title: 'Health Metrics',
      description: 'Track BMI, BMR, calorie intake, macros, and trends in one clean dashboard.'
    },
    {
      id: 4,
      icon: <span className="feature-carousel-emoji">🎯</span>,
      title: 'Personalised Goals',
      description: 'Set custom calorie targets, hydration goals, and dietary preferences tailored just for you.'
    }
  ]

  return (
    <div className="page landing-page">

      {/* Nav */}
      <nav className="nav landing-nav">
        <span className="nav-logo">&#x1F33F; Poshanix</span>
        <ThemeSwitch checked={theme === 'dark'} onToggle={toggleTheme} />
      </nav>

      {/* Hero */}
      <main className="hero landing-hero">
        <div className="landing-orb landing-orb-1" aria-hidden="true" />
        <div className="landing-orb landing-orb-2" aria-hidden="true" />
        <div className="landing-orb landing-orb-3" aria-hidden="true" />

        <div className="landing-hero-inner">
          <div className="badge landing-badge">
            <span className="badge-pulse" aria-hidden="true" />
            AI-Powered Nutrition
          </div>

          <h1 className="hero-title">
            <span className="hero-line">
              <span className="scan-text">Scan</span>
              <RotatingText
                texts={["Analyze.", "Interpret.", "Optimize."]}
                splitBy="words"
                rotationInterval={2200}
                staggerDuration={30}
                mainClassName="rotating"
              />
            </span>
            <span className="accent-line"><span className="accent">Eat Smarter.</span></span>
          </h1>

          <p className="hero-sub">
            Instantly decode the nutrition in any food — snap a photo and let
            AI do the rest. Track your health, hit your goals, and eat smarter
            every single day.
          </p>

          <div className="hero-ctas">
            <Button onClick={() => navigate('/auth')} />
          </div>

          <div className="hero-pills">
            <span className="hero-pill">✓ Free forever</span>
            <span className="hero-pill">✓ No credit card</span>
            <span className="hero-pill">✓ Instant results</span>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="landing-section landing-features">
        <p className="landing-eyebrow">What you get</p>
        <h2 className="landing-section-title">Everything you need to eat better</h2>
        <div className="features-carousel-wrap">
          <Carousel
            items={featureItems}
            baseWidth={380}
            autoplay
            autoplayDelay={3500}
            pauseOnHover
            loop
          />
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section landing-how">
        <p className="landing-eyebrow">Simple as 1-2-3</p>
        <h2 className="landing-section-title">How Poshanix works</h2>
        <div className="steps-row">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create your profile</h3>
            <p>Sign up in seconds and enter a few health details — age, weight, height, and your goals.</p>
          </div>
          <div className="steps-connector" aria-hidden="true">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none"><path d="M0 8h28M22 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Scan a food label</h3>
            <p>Open the scanner, snap a photo, and our AI will extract the full nutrition facts instantly.</p>
          </div>
          <div className="steps-connector" aria-hidden="true">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none"><path d="M0 8h28M22 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Get smart insights</h3>
            <p>Receive personalised analysis, health scores, and recommendations based on your profile.</p>
          </div>
        </div>
      </section>

     

      {/* Footer */}
      <footer className="footer landing-footer">
        <span className="nav-logo footer-brand">&#x1F33F; Poshanix</span>
        <span className="footer-dot">·</span>
        <span className="footer-copy">&copy; {new Date().getFullYear()}</span>
        <span className="footer-dot">·</span>
        <span className="footer-link" onClick={() => navigate('/privacy')}>Privacy Policy</span>
        <span className="footer-dot">·</span>
        <span className="footer-link" onClick={() => navigate('/terms')}>Terms of Service</span>
        <span className="footer-dot">·</span>
        <GitButton href="https://github.com/vabxic" label="@vabxic" />
        <GitButton href="https://github.com/HitarthSingh" label="@HitarthSingh" />
      </footer>
    </div>
  )
}

function App() {
  useEffect(() => {
    try { document.body.classList.add('app-mounted') } catch (e) { /* ignore */ }
    return () => { try { document.body.classList.remove('app-mounted') } catch (e) { /* ignore */ } }
  }, [])
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/home" element={<Home />} />
        <Route path="/food" element={<Food />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
    </Routes>
  )
}

export default App
