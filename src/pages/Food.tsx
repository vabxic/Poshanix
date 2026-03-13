import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import Loader from '../components/loader'
import FoodChatWidget from '../components/FoodChatWidget'
import { auth, saveFoodAnalysis } from '../lib/firebase'
import { AI_API_BASE } from '../lib/api'
import './Food.css'

ChartJS.register(ArcElement, Tooltip, Legend)

function extractValue(n: any): string | null {
  if (n === null || n === undefined) return null
  if (typeof n === 'object') {
    const v = n.value ?? n.amount ?? n.quantity
    return v !== undefined && v !== null ? String(v) : null
  }
  return String(n)
}

function sanitizeInsightText(input: string): string {
  let text = input.trim()
  if (!text) return ''

  // Handle escaped new lines from serialized responses.
  text = text.replace(/\\r\\n|\\n|\\r/g, '\n')

  // Remove markdown code fences if the model wrapped the response.
  text = text.replace(/^```(?:json|markdown|md|text)?\s*/i, '').replace(/```$/i, '').trim()

  // Strip markdown emphasis and heading markers for cleaner plain-text display.
  text = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^[-*]\s+/gm, '- ')

  // Normalize excessive spacing while preserving readable paragraphs.
  text = text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

export default function Food() {
  const location = useLocation()
  const navigate = useNavigate()
  const initial = (location.state as any)?.parsed || null
  const initialAiInsight = (location.state as any)?.ai_insight || null
  const [parsed, setParsed] = useState<any>(initial)
  const [loading, setLoading] = useState<boolean>(false)

  function formatAiInsightValue(val: any) {
    if (!val) return null
    if (typeof val === 'string') {
      const raw = val.trim()
      if (!raw) return null

      // Some API responses persist insight as stringified JSON.
      const maybeJson = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim()

      if ((maybeJson.startsWith('{') && maybeJson.endsWith('}')) || (maybeJson.startsWith('[') && maybeJson.endsWith(']'))) {
        try {
          const parsedJson = JSON.parse(maybeJson)
          return formatAiInsightValue(parsedJson)
        } catch {
          // Keep going with text sanitization.
        }
      }

      return sanitizeInsightText(raw)
    }
    try {
      const nf = val.nutrition_facts || val.nutritionFacts || {}
      const lines: string[] = []
      if (nf && Object.keys(nf).length > 0) {
        lines.push('Nutrition Summary:')
        const map = [
          ['Energy (kcal)', nf.energy_kcal_per_serving ?? nf.calories ?? nf.calories_per_serving],
          ['Protein (g)', nf.protein_g_per_100g ?? nf.protein_g ?? nf.protein_g_per_serving],
          ['Carbohydrate (g)', nf.carbohydrate_g_per_100g ?? nf.total_carbohydrate_g ?? nf.carbohydrate_g],
          ['Total sugars (g)', nf.total_sugars_g_per_100g ?? nf.sugars_g],
          ['Fiber (g)', nf.fiber_g_per_100g ?? nf.dietary_fiber_g],
          ['Total fat (g)', nf.total_fat_g ?? nf.total_fat],
          ['Saturated fat (g)', nf.saturated_fat_g ?? nf.saturated_fat],
          ['Trans fat (g)', nf.trans_fat_g ?? nf.trans_fat_g_per_serving ?? nf.trans_fat],
        ]
        for (const [label, value] of map) {
          if (value !== null && value !== undefined) lines.push(`${label}: ${value}`)
        }
      }

      const directInsight = val.ai_insight || val.ai_text || val.assistant_text || val.summary || val.insight
      if (typeof directInsight === 'string' && directInsight.trim()) {
        lines.push('', 'AI Insight:')
        lines.push(sanitizeInsightText(directInsight))
      }

      if (lines.length === 0) return JSON.stringify(val, null, 2)
      return sanitizeInsightText(lines.join('\n'))
    } catch {
      try { return sanitizeInsightText(JSON.stringify(val, null, 2)) } catch { return sanitizeInsightText(String(val)) }
    }
  }

  const [aiInsight, setAiInsight] = useState<string | null>(formatAiInsightValue(initialAiInsight))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    const user = auth.currentUser
    if (!user || !parsed) return
    setSaving(true)
    try {
      await saveFoodAnalysis(user.uid, {
        parsed,
        ai_insight: aiInsight,
      })
      setSaved(true)
    } catch (e) {
      console.error('Failed to save analysis', e)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!parsed || !parsed.cleaned_text) return
    const nf = parsed.nutrition_facts || {}
    if (nf && Object.keys(nf).length > 0) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${AI_API_BASE}/api/gemini/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: parsed.cleaned_text })
        })
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          if (!cancelled) {
            // Don't replace parsed data if the server returned a waiting/error status
            if (data && data.status === 'waiting_for_food_ocr') {
              console.warn('Server returned waiting_for_food_ocr — OCR text may not contain food data')
              setLoading(false)
              return
            }
            setParsed(data)
            if (data) {
              setAiInsight(formatAiInsightValue(data))
            }
            if (data && (data.ai_insight || data.ai_text || data.assistant_text || data.summary || data.insight)) {
              const raw = data.ai_insight || data.ai_text || data.assistant_text || data.summary || data.insight
              setAiInsight(formatAiInsightValue(raw))
            }
          }
        } else {
          const text = await res.text()
          const next = { ...parsed, medical_nutrition_advice: [{ condition: 'AI', advice: text.trim() }] }
          if (!cancelled) {
            setParsed(next)
            setAiInsight(null)
          }
        }
      } catch (e) {
        console.error('Food parse error', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [parsed])

  /* ── No data fallback ── */
  if (!parsed) {
    return (
      <div className="food-page">
        <nav className="food-nav">
          <span className="food-nav-logo">🌿 Poshanix</span>
        </nav>
        <main className="food-empty">
          <h2>No food data</h2>
          <p>Scan a food label first to see your analysis here.</p>
          <button className="food-btn" onClick={() => navigate('/home')}>← Back to Home</button>
        </main>
      </div>
    )
  }

  const nf = parsed.nutrition_facts || {}
  const ingredients: string[] | null = parsed.ingredients || null
  const healthScore = parsed.health_score ?? parsed.healthScore ?? null

  /* ── Extract a numeric nutrient value from various AI response shapes ── */
  function num(key: string): number {
    const per100 = nf.per_100g ?? nf.per100g ?? nf.per100 ?? nf
    const raw = per100?.[key] ?? per100?.[`${key}_g`] ?? per100?.[`${key}_mg`] ?? per100?.[`${key}_kcal`] ?? nf[key]
    const v = extractValue(raw)
    return v !== null ? parseFloat(v) || 0 : 0
  }

  /* ── Nutrition macros for the pie chart ── */
  const macros = useMemo(() => {
    const protein  = num('protein') || num('protein_g')
    const carbs    = num('total_carbohydrate') || num('carbohydrates') || num('carbohydrate_g') || num('carbohydrate')
    const fat      = num('total_fat') || num('total_fat_g') || num('fat')
    const fiber    = num('dietary_fiber') || num('fiber') || num('dietary_fiber_g')
    const sugar    = num('sugars') || num('sugars_g') || num('total_sugars')
    const sodium   = num('sodium') || num('sodium_mg')
    const cholesterol = num('cholesterol') || num('cholesterol_mg')
    return { protein, carbs, fat, fiber, sugar, sodium, cholesterol }
  }, [parsed])

  /* ── Allergens ── */
  function extractAllergens(text: string | null, ingredientsList: any) {
    const found: string[] = []
    if (typeof text === 'string') {
      const m = text.match(/ALLERGEN\s*ADVICE[:\-]?\s*([^\.\n]+)/i)
      if (m && m[1]) found.push(m[1].trim())
    }
    if (Array.isArray(ingredientsList)) {
      const ingText = ingredientsList.join(' ').toLowerCase()
      const common = ['milk', 'egg', 'peanut', 'soy', 'wheat', 'tree nut', 'almond', 'cashew', 'fish', 'shellfish', 'sesame']
      for (const c of common) if (ingText.includes(c) && !found.find(f => f.toLowerCase().includes(c))) found.push(c.charAt(0).toUpperCase() + c.slice(1))
    }
    return found.length ? found : []
  }

  const allergens = extractAllergens(parsed.cleaned_text ?? null, ingredients)

  interface MedicalAdviceItem {
    condition: string
    advice: string
  }

  const medicalAdvice = useMemo<MedicalAdviceItem[]>(() => {
    const items = parsed?.medical_nutrition_advice
    if (!Array.isArray(items)) return []

    return items
      .map((item: any, index: number) => {
        if (typeof item === 'string') {
          const cleaned = sanitizeInsightText(item)
          if (!cleaned) return null
          const splitAt = cleaned.indexOf(':')
          if (splitAt > 0 && splitAt < 45) {
            return {
              condition: cleaned.slice(0, splitAt).trim(),
              advice: cleaned.slice(splitAt + 1).trim(),
            }
          }
          return { condition: `Advice ${index + 1}`, advice: cleaned }
        }

        if (item && typeof item === 'object') {
          const condition = sanitizeInsightText(String(item.condition ?? item.title ?? item.topic ?? `Advice ${index + 1}`))
          const adviceText = item.advice ?? item.text ?? item.recommendation ?? item.details
          const advice = sanitizeInsightText(typeof adviceText === 'string' ? adviceText : String(adviceText ?? ''))
          if (!advice) return null
          return { condition: condition || `Advice ${index + 1}`, advice }
        }

        return null
      })
      .filter((x: MedicalAdviceItem | null): x is MedicalAdviceItem => Boolean(x))
  }, [parsed])

  /* ══════════════════════════════════════════════
     SMART HEALTH WARNINGS ENGINE
     Maps detected nutritional values & ingredients
     to specific health conditions.
     ══════════════════════════════════════════════ */
  interface HealthWarning {
    icon: string
    trigger: string
    condition: string
    advice: string
    severity: 'high' | 'medium' | 'low'
  }

  const healthWarnings = useMemo<HealthWarning[]>(() => {
    const w: HealthWarning[] = []
    const ingText = (Array.isArray(ingredients) ? ingredients.join(' ') : '').toLowerCase()
    const cleanedText = (parsed.cleaned_text ?? '').toLowerCase()
    const allText = ingText + ' ' + cleanedText

    // ── Sodium / Blood Pressure ──
    if (macros.sodium > 400) {
      w.push({ icon: '🧂', trigger: `High Sodium (${macros.sodium}mg)`, condition: 'Hypertension / High Blood Pressure', advice: 'People with high BP should limit or avoid this product. Excess sodium raises blood pressure and increases cardiovascular risk.', severity: macros.sodium > 800 ? 'high' : 'medium' })
    }

    // ── Sugar / Diabetes ──
    if (macros.sugar > 10) {
      w.push({ icon: '🍬', trigger: `High Sugar (${macros.sugar}g)`, condition: 'Diabetes / Insulin Resistance', advice: 'Diabetic individuals should avoid this product or consume in very small portions. High sugar spikes blood glucose levels rapidly.', severity: macros.sugar > 20 ? 'high' : 'medium' })
    }

    // ── Saturated / Trans Fat / Heart Disease ──
    const satFat = num('saturated_fat') || num('saturated_fat_g')
    const transFat = num('trans_fat') || num('trans_fat_g')
    if (satFat > 5 || transFat > 0.5) {
      w.push({ icon: '🫀', trigger: `Saturated Fat ${satFat}g / Trans Fat ${transFat}g`, condition: 'Heart Disease / High Cholesterol', advice: 'High saturated and trans fats raise LDL cholesterol. People with cardiovascular conditions or high cholesterol should limit intake.', severity: transFat > 1 || satFat > 10 ? 'high' : 'medium' })
    }

    // ── Cholesterol / Cardiovascular ──
    if (macros.cholesterol > 60) {
      w.push({ icon: '💉', trigger: `Cholesterol (${macros.cholesterol}mg)`, condition: 'Hypercholesterolemia', advice: 'Individuals managing cholesterol levels should be cautious. High dietary cholesterol can contribute to arterial plaque buildup.', severity: macros.cholesterol > 150 ? 'high' : 'medium' })
    }

    // ── Food Colours / Hyperactivity / Hyperhidrosis ──
    const colourKeywords = ['tartrazine', 'sunset yellow', 'allura red', 'brilliant blue', 'food colour', 'food color', 'artificial colour', 'artificial color', 'e102', 'e110', 'e129', 'e133', 'e122', 'e124', 'carmoisine', 'ponceau']
    if (colourKeywords.some(k => allText.includes(k))) {
      w.push({ icon: '🎨', trigger: 'Artificial Food Colours detected', condition: 'Hyperhidrosis / ADHD / Hyperactivity', advice: 'Artificial food colours are linked to increased sweating (hyperhidrosis) and hyperactivity in children. People sensitive to these additives should avoid this product.', severity: 'medium' })
    }

    // ── Caffeine ──
    const caffeineWords = ['caffeine', 'coffee extract', 'guarana', 'green tea extract']
    if (caffeineWords.some(k => allText.includes(k))) {
      w.push({ icon: '☕', trigger: 'Contains Caffeine', condition: 'Anxiety / Insomnia / Pregnancy', advice: 'Caffeine can worsen anxiety, disrupt sleep, and is not recommended during pregnancy. Individuals with heart arrhythmias should also exercise caution.', severity: 'medium' })
    }

    // ── High Calories / Obesity ──
    const calories = num('calories') || num('energy_kcal') || num('energy')
    if (calories > 350) {
      w.push({ icon: '🔥', trigger: `High Calories (${calories} kcal)`, condition: 'Obesity / Weight Management', advice: 'This product is calorie-dense. People on calorie-restricted diets or managing weight should consume in moderation.', severity: calories > 500 ? 'high' : 'medium' })
    }

    // ── Low Fiber / Digestive Health ──
    if (macros.fiber < 1 && macros.carbs > 15) {
      w.push({ icon: '🌾', trigger: `Very Low Fiber (${macros.fiber}g)`, condition: 'Constipation / Poor Gut Health', advice: 'Low fiber with high carbs can contribute to digestive issues. People with IBS or chronic constipation should pair this with fiber-rich foods.', severity: 'low' })
    }

    // ── Gluten ──
    const glutenWords = ['wheat', 'barley', 'rye', 'malt', 'gluten']
    if (glutenWords.some(k => allText.includes(k))) {
      w.push({ icon: '🌾', trigger: 'Contains Gluten', condition: 'Celiac Disease / Gluten Sensitivity', advice: 'People with celiac disease or gluten intolerance must avoid this product entirely to prevent intestinal damage and immune response.', severity: 'high' })
    }

    // ── Lactose / Dairy ──
    const dairyWords = ['milk', 'lactose', 'whey', 'casein', 'cream', 'butter', 'cheese']
    if (dairyWords.some(k => allText.includes(k))) {
      w.push({ icon: '🥛', trigger: 'Contains Dairy / Lactose', condition: 'Lactose Intolerance', advice: 'Lactose-intolerant individuals may experience bloating, cramps, and diarrhea. Consider lactase supplements or dairy-free alternatives.', severity: 'medium' })
    }

    // ── Preservatives ──
    const preservativeWords = ['sodium benzoate', 'potassium sorbate', 'bha', 'bht', 'sodium nitrite', 'sodium nitrate', 'e211', 'e202', 'e320', 'e321', 'e250', 'e251', 'sulphite', 'sulfite', 'preservative']
    if (preservativeWords.some(k => allText.includes(k))) {
      w.push({ icon: '🧪', trigger: 'Chemical Preservatives detected', condition: 'Allergic Reactions / Asthma', advice: 'Preservatives like sodium benzoate and sulphites can trigger asthma attacks, hives, and allergic reactions in sensitive individuals.', severity: 'medium' })
    }

    // ── MSG ──
    if (allText.includes('monosodium glutamate') || allText.includes('msg') || allText.includes('e621')) {
      w.push({ icon: '⚡', trigger: 'Contains MSG (E621)', condition: 'MSG Sensitivity / Migraines', advice: 'MSG can cause headaches, flushing, and numbness in sensitive individuals ("Chinese Restaurant Syndrome"). People prone to migraines should be cautious.', severity: 'low' })
    }

    // ── High Protein but concern for Kidney ──
    if (macros.protein > 25) {
      w.push({ icon: '💪', trigger: `High Protein (${macros.protein}g)`, condition: 'Kidney Disease', advice: 'While protein is essential, excessive amounts can strain kidneys in people with chronic kidney disease. Consult a doctor if CKD is present.', severity: 'low' })
    }

    return w
  }, [macros, parsed, ingredients])

  /* ── Pie chart data for INGREDIENTS ── */
  const PALETTE = [
    '#1CA74F', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#e11d48', '#a855f7', '#22d3ee', '#facc15',
  ]

  const pieData = useMemo(() => {
    if (!Array.isArray(ingredients) || ingredients.length === 0) return null

    const PCT_RE = /\((\d+(?:\.\d+)?)\s*%\)/

    // Parse label (strip the % annotation) and explicit percentage
    interface IngEntry { label: string; pct: number | null }
    const entries: IngEntry[] = ingredients.map(ing => {
      const m = ing.match(PCT_RE)
      const clean = ing.replace(PCT_RE, '').replace(/\s+/g, ' ').trim()
      return {
        label: clean.length > 32 ? clean.slice(0, 30) + '…' : clean,
        pct: m ? parseFloat(m[1]) : null,
      }
    })

    const explicitEntries = entries.filter(e => e.pct !== null)
    const implicitEntries = entries.filter(e => e.pct === null)
    const explicitVals = explicitEntries.map(e => e.pct as number)
    const totalExplicit = explicitVals.reduce((a, b) => a + b, 0)

    // ── Sub-component detection ──────────────────────────────────────────
    // If total explicit % > 100, some ingredients are sub-components of a
    // parent (e.g. Rice Meal 42% + Corn Meal 19% live inside Cereal Products 61%).
    // Strategy: for each explicit %, try to find a subset of the OTHER explicit
    // %s that sums to it (±1% tolerance). Those subset members are sub-components
    // and should be excluded from the top-level chart.
    const subIndices = new Set<number>()

    if (totalExplicit > 100.5) {
      const n = explicitVals.length
      for (let i = 0; i < n; i++) {
        const target = explicitVals[i]
        // Indices of all other explicit ingredients
        const otherIdxs = explicitVals.map((_, j) => j).filter(j => j !== i)
        // Enumerate all non-empty subsets of otherIdxs
        for (let mask = 1; mask < (1 << otherIdxs.length); mask++) {
          let sum = 0
          const subset: number[] = []
          for (let b = 0; b < otherIdxs.length; b++) {
            if (mask & (1 << b)) {
              sum += explicitVals[otherIdxs[b]]
              subset.push(otherIdxs[b])
            }
          }
          if (Math.abs(sum - target) <= 1.0) {
            // These subset members are sub-components of ingredient i
            subset.forEach(idx => subIndices.add(idx))
            break
          }
        }
      }
    }

    // Top-level explicit ingredients (not identified as sub-components)
    const topExplicit = explicitEntries.filter((_, i) => !subIndices.has(i))
    const topExplicitSum = topExplicit.reduce((a, e) => a + (e.pct as number), 0)

    // Distribute remaining % equally among no-percentage ingredients
    const remaining = Math.max(0, 100 - topExplicitSum)
    const fallback = implicitEntries.length > 0 ? remaining / implicitEntries.length : 0

    const allTop: IngEntry[] = [
      ...topExplicit,
      ...implicitEntries.map(e => ({ ...e, pct: parseFloat(fallback.toFixed(2)) })),
    ].filter(e => (e.pct ?? 0) > 0)

    if (allTop.length === 0) return null

    return {
      labels: allTop.map(e => e.label),
      datasets: [{
        data: allTop.map(e => parseFloat((e.pct as number).toFixed(2))),
        backgroundColor: allTop.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: 'rgba(255,255,255,0.9)',
        borderWidth: 2,
        hoverOffset: 8,
      }]
    }
  }, [ingredients])

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,15,15,0.85)',
        titleFont: { family: 'Inter, system-ui, sans-serif', size: 13 },
        bodyFont: { family: 'Inter, system-ui, sans-serif', size: 12 },
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (ctx: any) => {
            return ` ${ctx.label}: ${(ctx.raw as number).toFixed(1)}%`
          }
        }
      }
    }
  }

  return (
    <div className="food-page">
      {/* ── Nav ── */}
      <nav className="food-nav">
        <span className="food-nav-logo">🌿 Poshanix</span>
        <div className="food-nav-actions">
          <button
            className={`food-save-btn ${saved ? 'food-save-btn-saved' : ''}`}
            onClick={handleSave}
            disabled={saving || saved || !auth.currentUser}
            title={!auth.currentUser ? 'Sign in to save' : saved ? 'Saved!' : 'Save this analysis'}
          >
            {saving ? '⏳ Saving…' : saved ? '✅ Saved' : '💾 Save'}
          </button>
          <button className="food-back-btn" onClick={() => navigate('/home')}>← Back</button>
        </div>
      </nav>

      {loading && (
        <div className="food-loader-wrap"><Loader /></div>
      )}

      <main className="food-main">
        {/* ── Header ── */}
        <header className="food-header">
          <div>
            <h1 className="food-title">Food Analysis</h1>
            <p className="food-subtitle">AI-powered nutritional breakdown</p>
          </div>
          {healthScore !== null && (
            <div className="food-score-badge">
              <span className="food-score-value">{healthScore}</span>
              <span className="food-score-label">Health Score</span>
            </div>
          )}
        </header>

        {/* ── Two-column layout ── */}
        <div className="food-grid">

          {/* LEFT COLUMN */}
          <div className="food-col-left">

            {/* Ingredients list */}
            <section className="food-card">
              <h2 className="food-card-title">Ingredients</h2>
              {Array.isArray(ingredients) && ingredients.length > 0 ? (
                <div className="food-ingredients-list">
                  {ingredients.map((ing, i) => (
                    <span key={i} className="food-ingredient-chip">{ing}</span>
                  ))}
                </div>
              ) : (
                <p className="food-muted">No ingredients detected.</p>
              )}
            </section>

            {/* Allergens */}
            {allergens.length > 0 && (
              <section className="food-card food-card-warn">
                <h2 className="food-card-title">⚠️ Allergens</h2>
                <div className="food-allergen-list">
                  {allergens.map((a, i) => (
                    <span key={i} className="food-allergen-chip">{a}</span>
                  ))}
                </div>
              </section>
            )}

            {/* ── Smart Health Warnings ── */}
            {healthWarnings.length > 0 && (
              <section className="food-card">
                <h2 className="food-card-title">⚕️ Health Warnings</h2>
                <div className="food-warnings-list">
                  {healthWarnings.map((w, i) => (
                    <div key={i} className={`food-warning-item food-warning-${w.severity}`}>
                      <div className="food-warning-header">
                        <span className="food-warning-icon">{w.icon}</span>
                        <div>
                          <span className="food-warning-trigger">{w.trigger}</span>
                          <span className={`food-warning-severity food-sev-${w.severity}`}>{w.severity}</span>
                        </div>
                      </div>
                      <div className="food-warning-condition">{w.condition}</div>
                      <p className="food-warning-advice">{w.advice}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Medical Advice */}
            {medicalAdvice.length > 0 && (
              <section className="food-card food-card-medical">
                <h2 className="food-card-title">🩺 Medical Advice</h2>
                <div className="food-medical-list">
                  {medicalAdvice.map((item, i) => (
                    <div key={i} className="food-medical-item">
                      <div className="food-medical-condition">{item.condition}</div>
                      <p className="food-medical-advice">{item.advice}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* RIGHT COLUMN — Ingredients Pie chart */}
          <div className="food-col-right">
            <div className="food-card food-chart-card">
              <h2 className="food-card-title">Ingredient Breakdown</h2>
              {pieData ? (
                <>
                  <div className="food-chart-wrap">
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                  <div className="food-chart-legend">
                    {pieData.labels.map((label, i) => (
                      <div key={i} className="food-legend-item">
                        <span className="food-legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="food-legend-label">{label}</span>
                        <span className="food-legend-value">{(pieData.datasets[0].data[i] as number).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="food-muted">No ingredient data to chart.</p>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Food AI Chat ── */}
      <FoodChatWidget parsed={parsed} aiInsight={aiInsight} />
    </div>
  )
}
