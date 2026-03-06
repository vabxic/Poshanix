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
import ThemeSwitch from './components/Switch'
import RotatingText from './component/RotatingText'
import './App.css'

function Landing() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="page landing-page">
      {/* Nav */}
      <nav className="nav landing-nav">
        <span className="nav-logo">&#x1F33F; Poshanix</span>
        <div className="landing-nav-right">
          <ThemeSwitch checked={theme === 'dark'} onToggle={toggleTheme} />
          <button className="landing-signin-btn" onClick={() => navigate('/auth')}>Sign In</button>
        </div>
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
            <button className="cta-btn cta-primary" onClick={() => navigate('/auth')}>
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </button>
            <button className="cta-btn cta-secondary" onClick={() => navigate('/auth')}>
              Sign In
            </button>
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
        <div className="features-grid">
          <div className="feature-card-landing feature-card-accent">
            <div className="feature-icon-wrap">📸</div>
            <h3>Scan Any Label</h3>
            <p>Point your camera at any nutrition label — packaged food, restaurant menus, or upload a photo.</p>
          </div>
          <div className="feature-card-landing">
            <div className="feature-icon-wrap">🤖</div>
            <h3>AI Interpretation</h3>
            <p>Our AI instantly reads, extracts, and interprets full nutritional data with remarkable accuracy.</p>
          </div>
          <div className="feature-card-landing">
            <div className="feature-icon-wrap">📊</div>
            <h3>Health Metrics</h3>
            <p>Track BMI, BMR, calorie intake, macros, and trends — everything in one clean dashboard.</p>
          </div>
          <div className="feature-card-landing">
            <div className="feature-icon-wrap">🎯</div>
            <h3>Personalised Goals</h3>
            <p>Set custom calorie targets, hydration goals, and dietary preferences tailored just for you.</p>
          </div>
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

      {/* CTA Banner */}
      <section className="landing-cta-banner">
        <div className="landing-orb cta-banner-orb" aria-hidden="true" />
        <div className="cta-banner-inner">
          <div className="cta-banner-text">
            <h2 className="cta-banner-title">Ready to eat smarter?</h2>
            <p className="cta-banner-sub">Join Poshanix today — free, fast, and built for your health.</p>
          </div>
          <button className="cta-btn cta-primary cta-banner-btn" onClick={() => navigate('/auth')}>
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
          </button>
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
