import { useState, useRef, useEffect } from 'react'
import { AI_API_BASE } from '../lib/api'
import './ChatWidget.css'

interface FoodChatWidgetProps {
  parsed: any
  aiInsight: string | null
}

export default function FoodChatWidget({ parsed, aiInsight }: FoodChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function buildFoodContext(): string {
    const parts: string[] = []
    parts.push('You are a nutrition and health assistant. The user has just scanned a food product label. Here is the full analysis context:\n')

    if (parsed?.cleaned_text) {
      parts.push(`LABEL TEXT:\n${parsed.cleaned_text}\n`)
    }

    const nf = parsed?.nutrition_facts
    if (nf && Object.keys(nf).length > 0) {
      parts.push(`NUTRITION FACTS:\n${JSON.stringify(nf, null, 2)}\n`)
    }

    if (Array.isArray(parsed?.ingredients) && parsed.ingredients.length > 0) {
      parts.push(`INGREDIENTS: ${parsed.ingredients.join(', ')}\n`)
    }

    if (Array.isArray(parsed?.medical_nutrition_advice) && parsed.medical_nutrition_advice.length > 0) {
      parts.push(`MEDICAL/NUTRITION ADVICE:\n${parsed.medical_nutrition_advice.map((a: any) => typeof a === 'string' ? a : `${a.condition}: ${a.advice}`).join('\n')}\n`)
    }

    const hs = parsed?.health_score ?? parsed?.healthScore
    if (hs !== null && hs !== undefined) {
      parts.push(`HEALTH SCORE: ${hs}/100\n`)
    }

    if (aiInsight) {
      parts.push(`AI INSIGHT SUMMARY:\n${aiInsight}\n`)
    }

    parts.push('\nUse this food analysis data to answer the user\'s follow-up questions. Be concise, helpful, and provide personalized advice based on the scanned product. If the user asks about something unrelated to this food or nutrition in general, politely steer back to nutrition topics.')

    return parts.join('\n')
  }

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const systemContext = buildFoodContext()
      const chatHistory = [...messages, userMsg]
      const apiMessages = [
        { role: 'system', content: systemContext },
        ...chatHistory.map(m => ({ role: m.role, content: m.content })),
      ]

      const res = await fetch(`${AI_API_BASE}/api/gemini/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      })

      if (!res.ok) {
        let errMsg: string
        try {
          const data = await res.json()
          errMsg = friendlyError(data?.error?.message || data?.error || `Server error ${res.status}`, res.status)
        } catch {
          errMsg = friendlyError(`Server error ${res.status}`, res.status)
        }
        setMessages(m => [...m, { role: 'assistant', content: errMsg }])
        return
      }

      setMessages(m => [...m, { role: 'assistant', content: '' }])
      setLoading(false)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(m => {
          const arr = [...m]
          arr[arr.length - 1] = { ...arr[arr.length - 1], content: arr[arr.length - 1].content + chunk }
          return arr
        })
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Unable to reach the AI service. Please try again later.' }])
    } finally {
      setLoading(false)
    }
  }

  function friendlyError(msg: string, status: number): string {
    if (status === 503 || /not configured|GEMINI_API_KEY|administrator/i.test(msg))
      return 'The AI service is not available right now. Please try again later.'
    if (status === 429 || /high demand|rate limit|quota|overloaded/i.test(msg))
      return 'The AI service is busy. Please wait a moment and try again.'
    if (status >= 500)
      return 'The AI server encountered an error. Please try again shortly.'
    return 'Error: ' + msg
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const suggestions = [
    { label: 'Is this healthy?', text: 'Is this food product healthy for daily consumption?' },
    { label: 'Alternatives?', text: 'What are some healthier alternatives to this product?' },
    { label: 'Good for diet?', text: 'Is this product suitable for a weight loss diet?' },
  ]

  return (
    <div className={`chat-widget food-chat-widget ${open ? 'chat-open' : ''}`}>
      <button
        className="chat-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close food chat' : 'Ask about this food'}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="chat-badge">AI</span>
          </>
        )}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">🍽️</div>
              <div>
                <h3 className="chat-title">Food Assistant</h3>
                <p className="chat-status">Knows your food analysis</p>
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div className="chat-empty-icon">🍽️</div>
                <p className="chat-empty-text">Ask me anything about this food product — I already know the full analysis!</p>
                <div className="chat-suggestions">
                  {suggestions.map((s, i) => (
                    <button key={i} className="suggestion-chip" onClick={() => setInput(s.text)}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg-wrapper ${m.role}`}>
                <div className={`chat-msg ${m.role}`}>
                  {m.role === 'assistant' && <span className="msg-icon">🍽️</span>}
                  <span className="msg-content">{m.content}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg-wrapper assistant">
                <div className="chat-msg assistant typing">
                  <span className="msg-icon">🍽️</span>
                  <div className="typing-indicator"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-wrapper">
            <div className="chat-input">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this food..."
                disabled={loading}
              />
              <button className="send-btn" onClick={send} disabled={loading || !input.trim()} aria-label="Send message">
                {loading ? (
                  <div className="spinner-small" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
