const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const GEMINI_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_KEY) console.warn('Warning: GEMINI_API_KEY not set in environment')

const GEMINI_ENDPOINT = process.env.GEMINI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions'
const GEMINI_API_TYPE = (process.env.GEMINI_API_TYPE || '').toLowerCase()

const SYSTEM_INSTRUCTION = `You are a medical and nutrition data processing assistant.
You are a medical and nutrition data processing assistant.

INPUT CONTEXT:
You will receive RAW OCR text extracted from food labels or ingredient lists.
The OCR text may contain:
- spelling mistakes
- broken words
- random symbols
- duplicated or misplaced lines
- marketing text, addresses, logos
- incomplete or misaligned nutrition tables

PRIMARY OBJECTIVE:
Convert noisy OCR text into clean, structured nutrition data and provide
STRICTLY medical and nutrition-related guidance based ONLY on that data.

MANDATORY RULES (NON-NEGOTIABLE):
1. DO NOT guess, infer, estimate, or assume any value.
2. If a value is missing, unclear, or unreadable → use null.
3. DO NOT add nutrients, ingredients, or values not present in the OCR text.
4. DO NOT provide diagnosis, treatment, or medication advice.
5. DO NOT provide lifestyle, fitness, or general wellness advice.
6. DO NOT include disclaimers or legal language.
7. DO NOT mention brands, packaging, marketing claims, or addresses.
8. DO NOT explain your reasoning.
9. Output MUST be valid JSON only — no markdown, no text outside JSON.
10. Advice must be DIRECTLY justified by extracted nutrition values.

PROCESSING STEPS (FOLLOW IN ORDER):
STEP 1 — CLEANING: correct obvious OCR spelling errors, remove noise, normalize units, preserve numeric values exactly.
STEP 2 — EXTRACTION: extract nutrition facts only if explicitly present (serving size, calories, macronutrients, sodium, potassium, vitamins/minerals, ingredients).
STEP 3 — MEDICAL & NUTRITION INTERPRETATION: generate short factual observations justified by extracted values. If none, return empty advice array.

RESPONSE STYLE:
- Keep responses SHORT and PRECISE. Use as few words as necessary while remaining clinically clear.
- Prefer one-sentence factual observations for each advice item.
- When returning JSON, keep it compact (no extra whitespace) and only include required fields.

OUTPUT FORMAT: Return STRICT JSON with keys: cleaned_text, nutrition_facts, ingredients, medical_nutrition_advice.
Any violation of format or rules is considered a failure.`

async function callAI(messages, model = process.env.GEMINI_MODEL || 'gpt-3.5-turbo') {
  // Support a primary model plus comma-separated fallback list in env var GEMINI_FALLBACK_MODELS
  const fallback = (process.env.GEMINI_FALLBACK_MODELS || '').split(',').map(s => s.trim()).filter(Boolean)
  const models = [model].concat(fallback)

  // If configured to use Google Generative Language (Gemini), call that API format
  const useGoogle = GEMINI_API_TYPE === 'google' || GEMINI_ENDPOINT.includes('generativelanguage.googleapis.com')

  // Permanent errors: wrong API key, billing, auth — no point retrying
  function isPermanentError(bodyText, status) {
    if (status === 400 || status === 401 || status === 403) return true
    if (!bodyText) return false
    const t = String(bodyText).toLowerCase()
    return t.includes('api key not valid') || t.includes('invalid api key') || t.includes('api_key_invalid')
      || t.includes('permission denied') || t.includes('billing') || t.includes('unauthorized')
  }

  // Retryable errors: rate-limited, overloaded, server-side temporary failures
  function isRetryableErrorBody(bodyText, status) {
    if (status === 429 || status === 503 || status === 502) return true
    if (!bodyText) return false
    const t = String(bodyText).toLowerCase()
    return t.includes('rate limit') || t.includes('quota exceeded') || t.includes('insufficient_quota')
      || t.includes('resource has been exhausted') || t.includes('overloaded')
      || t.includes('maximum context length') || t.includes('context_length_exceeded')
  }

  const MAX_RETRIES = 3

  for (const m of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (useGoogle) {
          // Google Generative Language expects a different JSON shape. We'll post to
          // models/{model}:generateContent with `contents: [{ parts: [{ text }] }]`.
          const rawModel = m || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
          const modelName = rawModel.replace(/^models\//, '')
          const url = `${process.env.GEMINI_API_ENDPOINT || `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`}${process.env.GEMINI_API_KEY ? `?key=${process.env.GEMINI_API_KEY}` : ''}`

          const prompt = messages.map(mm => (mm.content || '')).join('\n')
          const body = { contents: [{ parts: [{ text: prompt }] }] }

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          const text = await res.text()
          if (!res.ok) {
            if (isPermanentError(text, res.status)) {
              console.error(`Model ${m} permanent error (Google) [${res.status}]:`, text.slice(0, 300))
              throw Object.assign(new Error(`AI API permanent error [${res.status}]: ${text.slice(0, 200)}`), { permanent: true })
            }
            if (isRetryableErrorBody(text, res.status)) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
              console.warn(`Model ${m} attempt ${attempt + 1} retryable error (Google) [${res.status}], retrying in ${delay}ms`)
              if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, delay))
                continue
              }
              break
            }
            // Non-retryable, non-permanent unknown error
            console.warn(`Model ${m} unknown error (Google) [${res.status}]:`, text.slice(0, 300))
            break
          }
          try { return JSON.parse(text) } catch (e) { return text }
        }

        // OpenAI-compatible chat completions
        const res = await fetch(GEMINI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_KEY}`
          },
          body: JSON.stringify({ model: m, messages, max_tokens: 800 })
        })

        const text = await res.text()
        let json = null
        try { json = JSON.parse(text) } catch (e) { /* not json */ }

        if (!res.ok) {
          const errBody = text || (json && json.error && json.error.message) || ''
          if (isPermanentError(errBody, res.status)) {
            console.error(`Model ${m} permanent error [${res.status}]:`, String(errBody).slice(0, 300))
            throw Object.assign(new Error(`AI API permanent error [${res.status}]: ${String(errBody).slice(0, 200)}`), { permanent: true })
          }
          if (isRetryableErrorBody(errBody, res.status)) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
            console.warn(`Model ${m} attempt ${attempt + 1} retryable error [${res.status}], retrying in ${delay}ms`)
            if (attempt < MAX_RETRIES - 1) {
              await new Promise(r => setTimeout(r, delay))
              continue
            }
            break
          }
          console.warn(`Model ${m} unknown non-ok error [${res.status}]:`, String(errBody).slice(0, 300))
          break
        }

        // return parsed json when possible, else raw text
        return json || text
      } catch (err) {
        if (err && err.permanent) throw err  // propagate permanent errors immediately
        // network or other unexpected error — retry or try next model
        console.warn(`callAI model ${m} attempt ${attempt + 1} error:`, err && err.message)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
          continue
        }
        break
      }
    }
  }

  // If all models failed, throw an error
  throw new Error('All AI model attempts failed. Check that GEMINI_API_KEY is set and valid on the server.')
}

function extractAssistantText(aiResponse) {
  if (!aiResponse) return ''

  // Google Generative Language shape: { candidates: [ { content: { parts: [ { text } ] } } ] }
  if (Array.isArray(aiResponse.candidates) && aiResponse.candidates.length > 0) {
    try {
      const parts = aiResponse.candidates[0].content && aiResponse.candidates[0].content.parts
      if (Array.isArray(parts)) return parts.map(p => p.text || '').join('')
    } catch (e) {}
  }

  // OpenAI chat shape: { choices: [ { message: { content } } ] }
  if (Array.isArray(aiResponse.choices) && aiResponse.choices.length > 0) {
    try {
      const msg = aiResponse.choices[0].message || aiResponse.choices[0]
      if (msg && (msg.content || msg.text)) return msg.content || msg.text || ''
    } catch (e) {}
  }

  // Some other shapes: try common paths
  if (aiResponse.output && Array.isArray(aiResponse.output)) {
    try {
      // e.g., output[0].content[0].text
      const out = aiResponse.output[0]
      if (out && out.content && Array.isArray(out.content)) {
        return out.content.map(c => c.text || '').join('')
      }
    } catch (e) {}
  }

  // Fallback: try to stringify any top-level text-like fields
  if (typeof aiResponse === 'string') return aiResponse
  try {
    return JSON.stringify(aiResponse)
  } catch (e) {
    return ''
  }
}

function isNutritionText(text) {
  if (!text) return false
  const re = /calori|serving|ingredient|protein|fat|carbohydrat|sodium|vitamin|calcium|iron|fiber|sugar/i
  return re.test(text)
}

app.post('/api/gemini/ocr', async (req, res) => {
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'AI service is not configured on this server (GEMINI_API_KEY missing). Please contact the administrator.' })
  }
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'missing text' })

    const messages = [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: `OCR TEXT:\n${text}` }
    ]

    const data = await callAI(messages)
    const assistantText = extractAssistantText(data).trim()

    // If the assistant did not return nutrition-related content, return waiting JSON exactly
    if (!isNutritionText(assistantText)) {
      return res.json({ status: 'waiting_for_food_ocr', message: 'Scan a food label to get nutrition information.' })
    }

    // If the assistant returned a JSON string (model was instructed to return strict JSON), parse and return JSON
    if (assistantText.startsWith('{') || assistantText.startsWith('[')) {
      try {
        const parsed = JSON.parse(assistantText)
        return res.json(parsed)
      } catch (e) {
        // not valid JSON, fallthrough to return plain text
      }
    }

    // Default: return only the assistant text (plain)
    res.type('text').send(assistantText)
  } catch (err) {
    console.error('OCR handler error', err && err.message ? err.message : err)
    if (err && err.permanent) {
      return res.status(502).json({ error: String(err.message || err), code: 'AI_PERMANENT_ERROR' })
    }
    return res.status(500).json({ error: String(err) })
  }
})

app.post('/api/gemini/chat', async (req, res) => {
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'AI service is not configured on this server (GEMINI_API_KEY missing). Please contact the administrator.' })
  }
  try {
    const { messages, message, userProfile } = req.body
    if (!messages && !message) return res.status(400).json({ error: 'missing messages or message' })
    
    // Build context from user profile if available
    let contextMessage = 'You are a helpful nutrition and health assistant. Provide concise, friendly, and supportive advice.'
    if (userProfile) {
      const profile = []
      if (userProfile.age) profile.push(`Age: ${userProfile.age} years`)
      if (userProfile.gender) profile.push(`Gender: ${userProfile.gender}`)
      if (userProfile.weight && userProfile.weight_unit) {
        profile.push(`Weight: ${userProfile.weight} ${userProfile.weight_unit}`)
      }
      if (userProfile.height && userProfile.height_unit) {
        profile.push(`Height: ${userProfile.height} ${userProfile.height_unit}`)
      }
      if (userProfile.bmi) profile.push(`BMI: ${userProfile.bmi}`)
      if (userProfile.bmr) profile.push(`BMR: ${userProfile.bmr} kcal/day`)
      if (userProfile.water_intake) profile.push(`Daily water intake: ${userProfile.water_intake}`)
      if (userProfile.eating_habits) profile.push(`Eating habits: ${userProfile.eating_habits.replace(/_/g, ' ')}`)
      if (userProfile.food_allergies) profile.push(`Food allergies: ${userProfile.food_allergies}`)
      if (userProfile.workout_level) profile.push(`Workout level: ${userProfile.workout_level}`)
      
      if (profile.length > 0) {
        contextMessage = `You are a helpful nutrition and health assistant. Here is the user's health profile:\n\n${profile.join('\n')}\n\nUse this information to provide personalized nutrition and health advice. Be concise, friendly, and supportive.`
      }
    }
    
    const msgs = messages || [
      { role: 'system', content: contextMessage },
      { role: 'user', content: message }
    ]
    
    const data = await callAI(msgs)
    const assistantText = extractAssistantText(data).trim()

    // If assistant text looks like JSON, attempt to parse and return JSON
    if (assistantText.startsWith('{') || assistantText.startsWith('[')) {
      try {
        const parsed = JSON.parse(assistantText)
        return res.json(parsed)
      } catch (e) {
        // fallthrough
      }
    }

    // Return plain assistant text
    return res.type('text').send(assistantText)
  } catch (err) {
    console.error('Chat handler error', err && err.message ? err.message : err)
    if (err && err.permanent) {
      return res.status(502).json({ error: String(err.message || err), code: 'AI_PERMANENT_ERROR' })
    }
    return res.status(500).json({ error: String(err) })
  }
})

// Basic root and health endpoints so the public URL can return a quick status
app.get('/', (req, res) => {
  res.status(200).send('Poshanix AI proxy — running')
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'poshanix-ai-proxy' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`AI proxy server listening on http://localhost:${port}`))
