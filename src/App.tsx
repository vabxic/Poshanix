import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion'
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

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      const duration = 2000
      const steps = 60
      const increment = value / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [isInView, value])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// Magnetic button wrapper
function MagneticButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current!.getBoundingClientRect()
    const x = (clientX - left - width / 2) * 0.3
    const y = (clientY - top - height / 2) * 0.3
    setPosition({ x, y })
  }

  const reset = () => setPosition({ x: 0, y: 0 })

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 3D Tilt card component
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 })

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current!.getBoundingClientRect()
    const x = (clientX - left) / width
    const y = (clientY - top) / height
    setRotateX((y - 0.5) * -20)
    setRotateY((x - 0.5) * 20)
    setGlarePosition({ x: x * 100, y: y * 100 })
  }

  const reset = () => {
    setRotateX(0)
    setRotateY(0)
    setGlarePosition({ x: 50, y: 50 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ rotateX, rotateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        '--glare-x': `${glarePosition.x}%`,
        '--glare-y': `${glarePosition.y}%`
      } as React.CSSProperties}
    >
      {children}
    </motion.div>
  )
}

// Floating particles background
function FloatingParticles() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }))

  return (
    <div className="particles-container">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="particle"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// Animated text reveal
function TextReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Staggered reveal container
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  },
}

function Landing() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll()

  // Parallax transforms
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, -200])
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const orb3Y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const smoothOrb1Y = useSpring(orb1Y, { stiffness: 50, damping: 20 })
  const smoothOrb2Y = useSpring(orb2Y, { stiffness: 50, damping: 20 })
  const smoothOrb3Y = useSpring(orb3Y, { stiffness: 50, damping: 20 })

  // Mouse follower for hero gradient
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

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

  const stats = [
    { value: 300, suffix: '+', label: 'Foods Scanned' },
    { value: 100, suffix: '+', label: 'Happy Users' },
    { value: 95, suffix: '%', label: 'Accuracy Rate' },
    { value: 24, suffix: '/7', label: 'AI Support' },
  ]

  return (
    <div className="page landing-page">
      <FloatingParticles />

      {/* Cursor follower gradient */}
      <motion.div
        className="cursor-gradient"
        animate={{
          x: mousePosition.x - 200,
          y: mousePosition.y - 200,
        }}
        transition={{ type: 'spring', stiffness: 50, damping: 30 }}
      />

      {/* Nav */}
      <motion.nav
        className="nav landing-nav"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          className="nav-logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          &#x1F33F; Poshanix
        </motion.span>
        <ThemeSwitch checked={theme === 'dark'} onToggle={toggleTheme} />
      </motion.nav>

      {/* Hero */}
      <main className="hero landing-hero" ref={heroRef}>
        <motion.div
          className="landing-orb landing-orb-1"
          aria-hidden="true"
          style={{ y: smoothOrb1Y }}
        />
        <motion.div
          className="landing-orb landing-orb-2"
          aria-hidden="true"
          style={{ y: smoothOrb2Y }}
        />
        <motion.div
          className="landing-orb landing-orb-3"
          aria-hidden="true"
          style={{ y: smoothOrb3Y }}
        />

        <div className="landing-hero-inner">
          <motion.div
            className="badge landing-badge"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(74, 222, 128, 0.3)' }}
          >
            <motion.span
              className="badge-pulse"
              aria-hidden="true"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            AI-Powered Nutrition
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hero-line">
              <motion.span
                className="scan-text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Scan
              </motion.span>
              <RotatingText
                texts={["Analyze.", "Interpret.", "Optimize."]}
                splitBy="words"
                rotationInterval={2200}
                staggerDuration={30}
                mainClassName="rotating"
              />
            </span>
            <motion.span
              className="accent-line"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <span className="accent glow-text">Eat Smarter.</span>
            </motion.span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            Instantly decode the nutrition in any food — snap a photo and let
            AI do the rest. Track your health, hit your goals, and eat smarter
            every single day.
          </motion.p>

          <motion.div
            className="hero-ctas"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <MagneticButton>
              <Button onClick={() => navigate('/auth')} />
            </MagneticButton>
          </motion.div>

          <motion.div
            className="hero-pills"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {['✓ Free forever', '✓ No credit card', '✓ Instant results'].map((pill, index) => (
              <motion.span
                key={index}
                className="hero-pill"
                variants={staggerItem}
                whileHover={{
                  scale: 1.05,
                  borderColor: 'rgba(74, 222, 128, 0.4)',
                  boxShadow: '0 4px 20px rgba(74, 222, 128, 0.15)'
                }}
              >
                {pill}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="landing-section landing-stats">
        <motion.div
          className="stats-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="stat-card"
              variants={staggerItem}
              whileHover={{
                y: -5,
                boxShadow: '0 20px 40px rgba(74, 222, 128, 0.15)',
                borderColor: 'rgba(74, 222, 128, 0.4)'
              }}
            >
              <span className="stat-value">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="landing-section landing-features">
        <TextReveal>
          <p className="landing-eyebrow">What you get</p>
        </TextReveal>
        <TextReveal delay={0.1}>
          <h2 className="landing-section-title">Everything you need to eat better</h2>
        </TextReveal>
        <motion.div
          className="features-carousel-wrap"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Carousel
            items={featureItems}
            baseWidth={380}
            autoplay
            autoplayDelay={3500}
            pauseOnHover
            loop
          />
        </motion.div>
      </section>

      {/* How it works */}
      <section className="landing-section landing-how">
        <TextReveal>
          <p className="landing-eyebrow">Simple as 1-2-3</p>
        </TextReveal>
        <TextReveal delay={0.1}>
          <h2 className="landing-section-title">How Poshanix works</h2>
        </TextReveal>
        <motion.div
          className="steps-row"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          <TiltCard className="step-card-wrapper">
            <motion.div className="step-card" variants={staggerItem}>
              <motion.div
                className="step-number"
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                1
              </motion.div>
              <h3>Create your profile</h3>
              <p>Sign up in seconds and enter a few health details — age, weight, height, and your goals.</p>
              <div className="step-glow" />
            </motion.div>
          </TiltCard>
          <motion.div
            className="steps-connector"
            aria-hidden="true"
            variants={staggerItem}
          >
            <motion.svg
              width="32"
              height="16"
              viewBox="0 0 32 16"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <motion.path
                d="M0 8h28M22 2l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.div>
          <TiltCard className="step-card-wrapper">
            <motion.div className="step-card" variants={staggerItem}>
              <motion.div
                className="step-number"
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                2
              </motion.div>
              <h3>Scan a food label</h3>
              <p>Open the scanner, snap a photo, and our AI will extract the full nutrition facts instantly.</p>
              <div className="step-glow" />
            </motion.div>
          </TiltCard>
          <motion.div
            className="steps-connector"
            aria-hidden="true"
            variants={staggerItem}
          >
            <motion.svg
              width="32"
              height="16"
              viewBox="0 0 32 16"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <motion.path
                d="M0 8h28M22 2l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.div>
          <TiltCard className="step-card-wrapper">
            <motion.div className="step-card" variants={staggerItem}>
              <motion.div
                className="step-number"
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                3
              </motion.div>
              <h3>Get smart insights</h3>
              <p>Receive personalised analysis, health scores, and recommendations based on your profile.</p>
              <div className="step-glow" />
            </motion.div>
          </TiltCard>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="landing-section landing-testimonials">
        <TextReveal>
          <p className="landing-eyebrow">Loved by thousands</p>
        </TextReveal>
        <TextReveal delay={0.1}>
          <h2 className="landing-section-title">What our users say</h2>
        </TextReveal>
        <motion.div
          className="testimonials-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          {[
            { name: 'Priya S.', role: 'College Student', text: 'Super helpful for tracking what I eat in hostel. Just snap a pic and it tells me everything about the food!' },
            { name: 'Rahul M.', role: 'Software Developer', text: 'Been using it for 2 weeks now. Really helps me stay on track with my calorie goals during work from home.' },
            { name: 'Ananya T.', role: 'Gym Goer', text: 'The macro breakdown is exactly what I needed. No more guessing protein content from packaged foods.' },
          ].map((testimonial, index) => (
            <TiltCard key={index} className="testimonial-card-wrapper">
              <motion.div className="testimonial-card" variants={staggerItem}>
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">
                    {testimonial.name[0]}
                  </div>
                  <div className="testimonial-info">
                    <span className="testimonial-name">{testimonial.name}</span>
                    <span className="testimonial-role">{testimonial.role}</span>
                  </div>
                </div>
              </motion.div>
            </TiltCard>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="landing-section landing-cta">
        <motion.div
          className="cta-card"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="cta-card-bg" />
          <TextReveal>
            <h2 className="cta-title">Ready to eat smarter?</h2>
          </TextReveal>
          <TextReveal delay={0.1}>
            <p className="cta-subtitle">Join thousands of users who have transformed their nutrition with AI-powered insights.</p>
          </TextReveal>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MagneticButton className="cta-button-wrapper">
              <motion.button
                className="cta-btn cta-primary cta-large"
                onClick={() => navigate('/auth')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Your Journey
                <motion.span
                  className="cta-arrow"
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                >
                  →
                </motion.span>
              </motion.button>
            </MagneticButton>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        className="footer landing-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="nav-logo footer-brand">&#x1F33F; Poshanix</span>
        <span className="footer-dot">·</span>
        <span className="footer-copy">&copy; {new Date().getFullYear()}</span>
        <span className="footer-dot">·</span>
        <motion.span
          className="footer-link"
          onClick={() => navigate('/privacy')}
          whileHover={{ color: 'var(--accent)' }}
        >
          Privacy Policy
        </motion.span>
        <span className="footer-dot">·</span>
        <motion.span
          className="footer-link"
          onClick={() => navigate('/terms')}
          whileHover={{ color: 'var(--accent)' }}
        >
          Terms of Service
        </motion.span>
        <span className="footer-dot">·</span>
        <GitButton href="https://github.com/vabxic" label="@vabxic" />
        <GitButton href="https://github.com/HitarthSingh" label="@HitarthSingh" />
      </motion.footer>
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
