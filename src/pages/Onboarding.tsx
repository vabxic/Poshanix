import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, onAuthChange, updateProfile, uploadFile } from '../lib/firebase'
import { useTheme } from '../lib/useTheme'
import ThemeSwitch from '../components/Switch'
import Loader from '../components/loader'
import './Onboarding.css'

type Step = 'mandatory' | 'medical' | 'optional'

function Onboarding() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()

  /* auth guard */
  const [userId, setUserId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) { navigate('/auth'); return }
      setUserId(currentUser.uid)
      setChecking(false)
    })
    return () => unsubscribe()
  }, [navigate])

  /* step control */
  const [step, setStep] = useState<Step>('mandatory')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  /* mandatory fields */
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [height, setHeight] = useState('')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [waterIntake, setWaterIntake] = useState('')
  const [eatingHabits, setEatingHabits] = useState('')

  /* medical history */
  const [hasMedicalHistory, setHasMedicalHistory] = useState<null | boolean>(null)
  const [medicalFile, setMedicalFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  /* optional */
  const [foodAllergies, setFoodAllergies] = useState('')
  const [workoutLevel, setWorkoutLevel] = useState('')

  /* ---- Mandatory submit ---- */
  const handleMandatory = (e: FormEvent) => {
    e.preventDefault()
    if (!age || !gender || !weight || !height || !waterIntake || !eatingHabits) {
      setError('Please fill in all required fields.')
      return
    }
    if (Number(age) < 1 || Number(age) > 120) {
      setError('Please enter a valid age (1-120).')
      return
    }
    if (Number(weight) <= 0) {
      setError('Please enter a valid weight.')
      return
    }
    setError('')
    setStep('medical')
  }

  /* ---- Medical submit ---- */
  const handleMedical = async () => {
    setError('')

    let docUrl: string | null = null

    if (hasMedicalHistory && medicalFile && userId) {
      setUploadingDoc(true)
      const ext = medicalFile.name.split('.').pop()
      const path = `medical-docs/${userId}/medical_${Date.now()}.${ext}`
      try {
        docUrl = await uploadFile(path, medicalFile)
      } catch (upErr: any) {
        /* storage may not be configured yet */
        console.warn('Upload failed:', upErr.message)
      }
      setUploadingDoc(false)
    }

    /* stash doc URL for final save */
    setMedicalDocUrl(docUrl)
    setStep('optional')
  }

  const [medicalDocUrl, setMedicalDocUrl] = useState<string | null>(null)

  /* ---- Final save ---- */
  const handleSave = async (skippedOptional = false) => {
    if (!userId) return
    setError('')
    setSaving(true)

    // Calculate BMI and BMR
    const weightKg = weightUnit === 'lbs' ? Number(weight) * 0.453592 : Number(weight)
    const heightM = heightUnit === 'ft' ? Number(height) * 0.3048 : Number(height) / 100
    const heightCm = heightUnit === 'ft' ? Number(height) * 30.48 : Number(height)
    const bmi = (weightKg > 0 && heightM > 0) ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : null
    let bmr: number | null = null
    if (weightKg > 0 && heightCm > 0 && Number(age) > 0 && gender) {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * Number(age) + (gender === 'male' ? 5 : -161))
    }

    const payload: Record<string, unknown> = {
      age: Number(age),
      gender,
      weight: Number(weight),
      weight_unit: weightUnit,
      height: Number(height),
      height_unit: heightUnit,
      bmi,
      bmr,
      water_intake: waterIntake,
      eating_habits: eatingHabits,
      has_medical_history: hasMedicalHistory ?? false,
      medical_doc_url: medicalDocUrl,
      onboarding_completed: true,
    }

    if (!skippedOptional) {
      if (foodAllergies.trim()) payload.food_allergies = foodAllergies.trim()
      if (workoutLevel) payload.workout_level = workoutLevel
    }

    try {
      await updateProfile(userId, payload)
      navigate('/home')
    } catch (dbErr: any) {
      setError('Failed to save: ' + dbErr.message)
    } finally {
      setSaving(false)
    }
  }

  /* ---- Render helpers ---- */
  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </div>
    )
  }

  return (
    <div className="onboard-page">
      {/* Nav */}
      <nav className="nav">
        <span className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          &#x1F33F; Poshanix
        </span>
        <ThemeSwitch checked={theme === 'dark'} onToggle={toggleTheme} />
      </nav>

      <main className="onboard-container">
        <div className="onboard-card">
          {/* Progress */}
          <div className="onboard-progress">
            {/* Step 1 */}
            <div className="prog-step">
              <div className={`prog-dot ${step === 'mandatory' ? 'active' : 'done'}`}>
                {step !== 'mandatory' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : '1'}
              </div>
              <span className="prog-step-label">Basics</span>
            </div>
            <div className={`prog-line ${step !== 'mandatory' ? 'filled' : ''}`} />
            {/* Step 2 */}
            <div className="prog-step">
              <div className={`prog-dot ${step === 'medical' ? 'active' : step === 'optional' ? 'done' : ''}`}>
                {step === 'optional' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : '2'}
              </div>
              <span className="prog-step-label">Medical</span>
            </div>
            <div className={`prog-line ${step === 'optional' ? 'filled' : ''}`} />
            {/* Step 3 */}
            <div className="prog-step">
              <div className={`prog-dot ${step === 'optional' ? 'active' : ''}`}>3</div>
              <span className="prog-step-label">Lifestyle</span>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {/* ============== STEP 1 — Mandatory ============== */}
          {step === 'mandatory' && (
            <form className="onboard-form" onSubmit={handleMandatory}>
              <div className="step-hero">
                <div className="step-emoji">📋</div>
                <h2 className="onboard-title">Tell us about yourself</h2>
                <p className="onboard-sub">All fields below are required to personalise your experience.</p>
              </div>

              {/* Age */}
              <label className="field-label"><span className="label-icon"></span> Age</label>
              <input
                className="auth-input"
                type="number"
                placeholder="e.g. 25"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />

              {/* Gender */}
              <label className="field-label"><span className="label-icon"></span> Gender</label>
              <div className="chip-group">
                {[
                  { value: 'male',   label: 'Male',   icon: '' },
                  { value: 'female', label: 'Female', icon: '' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`chip ${gender === opt.value ? 'chip-active' : ''}`}
                    onClick={() => setGender(opt.value as 'male' | 'female')}
                  >
                    <span className="chip-icon">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>

              {/* Weight */}
              <label className="field-label"><span className="label-icon"></span> Weight</label>
              <div className="weight-row">
                <input
                  className="auth-input weight-input"
                  type="number"
                  placeholder="e.g. 70"
                  step="0.1"
                  min={1}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
                <div className="unit-toggle">
                  <button
                    type="button"
                    className={`unit-btn ${weightUnit === 'kg' ? 'unit-active' : ''}`}
                    onClick={() => setWeightUnit('kg')}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    className={`unit-btn ${weightUnit === 'lbs' ? 'unit-active' : ''}`}
                    onClick={() => setWeightUnit('lbs')}
                  >
                    lbs
                  </button>
                </div>
              </div>

              {/* Height */}
              <label className="field-label"><span className="label-icon"></span> Height</label>
              <div className="weight-row">
                <input
                  className="auth-input weight-input"
                  type="number"
                  placeholder={heightUnit === 'cm' ? 'e.g. 170' : 'e.g. 5.7'}
                  step="0.1"
                  min={1}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
                <div className="unit-toggle">
                  <button
                    type="button"
                    className={`unit-btn ${heightUnit === 'cm' ? 'unit-active' : ''}`}
                    onClick={() => setHeightUnit('cm')}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    className={`unit-btn ${heightUnit === 'ft' ? 'unit-active' : ''}`}
                    onClick={() => setHeightUnit('ft')}
                  >
                    ft
                  </button>
                </div>
              </div>

              {/* Water Intake */}
              <label className="field-label"><span className="label-icon"></span> Daily Water Intake</label>
              <div className="chip-group">
                {[
                  { value: '1-2L', label: '1–2 L', icon: '' },
                  { value: '2-3L', label: '2–3 L', icon: '' },
                  { value: '3L+',  label: '3 L+',  icon: '' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`chip ${waterIntake === opt.value ? 'chip-active' : ''}`}
                    onClick={() => setWaterIntake(opt.value)}
                  >
                    <span className="chip-icon">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>

              {/* Eating Habits */}
              <label className="field-label"><span className="label-icon"></span> Eating Habits</label>
              <div className="chip-group">
                {[
                  { value: '1_meal',   label: '1 Meal',   icon: '' },
                  { value: '2_meals',  label: '2 Meals',  icon: '' },
                  { value: '3_meals',  label: '3 Meals',  icon: '' },
                  { value: '3+_meals', label: '3+ Meals', icon: '' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`chip ${eatingHabits === opt.value ? 'chip-active' : ''}`}
                    onClick={() => setEatingHabits(opt.value)}
                  >
                    <span className="chip-icon">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>

              <button className="primary-btn continue-btn" type="submit">
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </form>
          )}

          {/* ============== STEP 2 — Medical History ============== */}
          {step === 'medical' && (
            <div className="onboard-form">
              <div className="step-hero">
                <div className="step-emoji">🏥</div>
                <h2 className="onboard-title">Medical History</h2>
                <p className="onboard-sub">Do you have any prior medical history we should know about?</p>
              </div>

              <div className="chip-group center">
                <button
                  type="button"
                  className={`chip ${hasMedicalHistory === true ? 'chip-active' : ''}`}
                  onClick={() => setHasMedicalHistory(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`chip ${hasMedicalHistory === false ? 'chip-active' : ''}`}
                  onClick={() => { setHasMedicalHistory(false); setMedicalFile(null) }}
                >
                  No
                </button>
              </div>

              {hasMedicalHistory && (
                <div className="upload-area">
                  <label className="upload-label" htmlFor="med-file">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {medicalFile ? medicalFile.name : 'Upload medical documents'}
                  </label>
                  <input
                    id="med-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={(e) => setMedicalFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              <div className="btn-row">
                <button className="secondary-btn" onClick={() => setStep('mandatory')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>
                <button
                  className="skip-btn"
                  onClick={() => { setHasMedicalHistory(null); setMedicalFile(null); setStep('optional') }}
                >
                  Skip step
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                </button>
                <button
                  className="primary-btn continue-btn"
                  disabled={uploadingDoc}
                  onClick={handleMedical}
                >
                  {uploadingDoc ? 'Uploading…' : 'Continue'}
                  {!uploadingDoc && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
                </button>
              </div>
            </div>
          )}

          {/* ============== STEP 3 — Optional ============== */}
          {step === 'optional' && (
            <div className="onboard-form">
              <div className="step-hero">
                <div className="step-emoji">🌿</div>
                <h2 className="onboard-title">Almost Done!</h2>
                <p className="onboard-sub">These are optional — answer what you can or skip freely.</p>
              </div>

              {/* Food Allergies */}
              <label className="field-label"><span className="label-icon"></span> Food Allergies</label>
              <textarea
                className="auth-input textarea"
                placeholder="e.g. peanuts, shellfish, gluten …"
                rows={3}
                value={foodAllergies}
                onChange={(e) => setFoodAllergies(e.target.value)}
              />

              {/* Workout Level */}
              <label className="field-label"><span className="label-icon"></span> Workout Level</label>
              <div className="chip-group">
                {[
                  { value: 'none',     label: 'None',     icon: '🚶' },
                  { value: 'moderate', label: 'Moderate', icon: '🏃' },
                  { value: 'high',     label: 'High',     icon: '🏋️' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`chip ${workoutLevel === opt.value ? 'chip-active' : ''}`}
                    onClick={() => setWorkoutLevel(opt.value)}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              <div className="btn-row">
                <button className="secondary-btn" onClick={() => setStep('medical')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>
                <button className="skip-btn" onClick={() => handleSave(true)} disabled={saving}>
                  Skip &amp; Finish
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                </button>
                <button className="primary-btn continue-btn" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? 'Saving…' : <>
                    Finish
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </>}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Onboarding
