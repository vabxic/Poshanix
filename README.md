# 🌿 Poshanix — AI-Powered Nutrition Scanner

> Snap a food label. Get instant AI nutrition analysis, personalised health insights, and a smart chat assistant — all in one app.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)
[![AI Backend on Render](https://img.shields.io/badge/API-Render-46E3B7?logo=render)](https://render.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Pages & Routes](#pages--routes)
- [Key Components](#key-components)
- [Firebase Schema](#firebase-schema)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Feature | Description |
|---|---|
| 📸 **Food Label Scanner** | Upload an image or use your device camera to scan any nutrition label |
| 🔍 **On-device OCR** | Tesseract.js runs OCR entirely in the browser — no image ever leaves the client |
| 🤖 **AI Nutrition Parsing** | Raw OCR text is sent to a Node.js proxy which calls Google Gemini or OpenAI to extract structured nutrition facts, ingredients, and health observations |
| 📊 **Health Score** | Every scanned item gets a 0–100 health score with itemised medical/nutrition notes |
| 💬 **Streaming AI Chat** | Floating chat widget with real-time token streaming — responses appear word-by-word as they generate |
| 🍽️ **Food-context Chat** | A second chat widget on the Food page has full context of the scanned product and can answer specific questions about it |
| 🧬 **Personalised Profile** | Stores age, gender, weight, height, BMI, BMR, water intake, eating habits, allergies, and workout level — used to personalise AI responses |
| 🕓 **Saved Analyses** | Previous scans are saved to Firestore and can be revisited from the Home dashboard |
| 🌙 **Dark / Light Theme** | System-aware theme with a toggle switch, persisted across sessions |
| 🔐 **Firebase Auth** | Email/password and Google sign-in, guarded routes, onboarding flow for new users |
| ⚖️ **Legal Pages** | Privacy Policy and Terms of Service pages |

---

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 7 | Build tool & dev server |
| React Router DOM | 7 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling |
| styled-components | 6 | Component-scoped CSS-in-JS |
| Motion (Framer Motion) | 12 | Animations |
| @react-spring/web | 9 | Spring physics animations |
| Tesseract.js | 7 | In-browser OCR |
| Chart.js + react-chartjs-2 | 4/5 | Nutrition charts |
| Lucide React | 0.575 | Icon library |
| Firebase | 11 | Auth, Firestore, Storage |

### Backend (AI Proxy Server)
| Library | Version | Purpose |
|---|---|---|
| Node.js + Express | 4 | HTTP server |
| node-fetch | 2 | Upstream AI API calls |
| dotenv | 16 | Environment config |
| cors | 2 | Cross-origin requests |

### Infrastructure
| Service | Role |
|---|---|
| **Vercel** | Frontend hosting (auto-deploys on push to `main`) |
| **Render** | AI proxy server hosting |
| **Firebase** | Auth, Firestore database, file storage |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Vercel)                      │
│                                                          │
│  ┌──────────┐   OCR (in-browser)   ┌─────────────────┐  │
│  │ Home.tsx │──Tesseract.js──────▶ │  Food.tsx       │  │
│  │          │                      │  (parse + show) │  │
│  └──────────┘                      └────────┬────────┘  │
│                                             │            │
│                         POST /api/gemini/*  │            │
└─────────────────────────────────────────────┼────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────┐
                              │   Node.js Proxy (Render)   │
                              │   server/index.js          │
                              │                            │
                              │  /api/gemini/ocr           │
                              │  /api/gemini/chat          │
                              │  /api/gemini/chat/stream   │
                              └──────────┬────────────────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │                             │
                          ▼                             ▼
               ┌─────────────────┐          ┌──────────────────┐
               │  Google Gemini  │    OR    │  OpenRouter /    │
               │  (Generative    │          │  OpenAI-compat.  │
               │   Language API) │          │  endpoint        │
               └─────────────────┘          └──────────────────┘
```

---

## Project Structure

```
Poshanix/
├── public/                     # Static assets
├── src/
│   ├── App.tsx                 # Root router + Landing page
│   ├── App.css
│   ├── main.tsx                # React entry point
│   ├── assets/
│   ├── component/              # Generic reusable UI components
│   │   ├── button.tsx
│   │   ├── Carousel.tsx / .css
│   │   └── RotatingText.tsx / .css
│   ├── components/             # Feature components
│   │   ├── ChatWidget.tsx      # General nutrition AI chat (streaming)
│   │   ├── FoodChatWidget.tsx  # Food-context AI chat (streaming)
│   │   ├── ChatWidget.css
│   │   ├── Switch.tsx / .css   # Dark/light theme toggle
│   │   ├── loader.tsx          # General loading spinner
│   │   ├── loader-ocr.tsx      # OCR progress loader
│   │   └── animate-ui/         # Animated icon primitives
│   ├── hooks/
│   │   └── use-is-in-view.tsx
│   ├── legal/
│   │   ├── Privacy.tsx
│   │   └── Terms.tsx
│   ├── lib/
│   │   ├── api.ts              # AI_API_BASE constant (env-aware)
│   │   ├── firebase.ts         # Firebase init, auth, Firestore helpers
│   │   ├── useTheme.ts         # Dark/light theme hook
│   │   └── utils.ts            # Tailwind class merger (cn)
│   └── pages/
│       ├── Auth.tsx / .css     # Sign in / Sign up
│       ├── Home.tsx / .css     # Dashboard, scanner, saved analyses
│       ├── Food.tsx / .css     # AI nutrition results + Food chat
│       ├── Onboarding.tsx/.css # First-time profile setup
│       └── Profile.tsx / .css  # View/edit user profile
├── server/
│   ├── index.js                # Express AI proxy server
│   ├── package.json
│   ├── .env                    # Server secrets (not committed)
│   └── README.md
├── supabase/
│   └── migrations/             # SQL migration history
├── vercel.json                 # SPA rewrite rules for Vercel
├── .npmrc                      # legacy-peer-deps for React 19 compat
├── vite.config.ts
├── tailwind.config.cjs
├── tsconfig.json
└── .env                        # Frontend secrets (not committed)
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and **npm** 9+
- A **Firebase** project (Auth + Firestore enabled)
- A **Google Gemini** API key **or** an **OpenRouter** API key

### 1 — Clone & install

```bash
git clone https://github.com/vabxic/Poshanix.git
cd Poshanix

# Frontend dependencies (legacy-peer-deps handles React 19 compat)
npm install

# Server dependencies
cd server && npm install && cd ..
```

### 2 — Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section for the full list.

### 3 — Start the AI proxy server

```bash
cd server
npm start
# Server listens on http://localhost:3001
```

### 4 — Start the frontend dev server

```bash
# In a second terminal, from the project root
npm run dev
# Vite starts on http://localhost:5173 (or next available port)
```

### 5 — Open the app

Navigate to `http://localhost:5173`. Sign up, complete onboarding, then scan a food label from the Home page.

---

## Environment Variables

### Frontend — `.env` (project root)

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (`*.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_AI_API_BASE` | *(optional)* Override the AI proxy URL. Defaults to `https://poshanix.onrender.com`. Set to `http://localhost:3001` for local development |

> `.env.local` is gitignored and pre-configured with `VITE_AI_API_BASE=http://localhost:3001` for local development.

### Server — `server/.env`

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | API key for Google Gemini |
| `OPEN_ROUTER_API_KEY` | — | API key for OpenRouter (if using `openrouter` type) |
| `GEMINI_API_TYPE` | — | `google` · `openrouter` · *(blank = OpenAI-compatible)* |
| `GEMINI_MODEL` | `gpt-3.5-turbo` | Model name to use, e.g. `gemini-2.5-flash` |
| `GEMINI_API_ENDPOINT` | Gemini/OpenAI default | Custom chat completions endpoint |
| `GEMINI_FALLBACK_MODELS` | — | Comma-separated fallback model list |
| `PORT` | `3001` | Server port |

---

## API Reference

All endpoints are served by `server/index.js`.

### `POST /api/gemini/ocr`

Parses raw OCR text from a food label into structured nutrition data.

**Request body:**
```json
{ "text": "<raw OCR string from Tesseract>" }
```

**Response** (`200 OK`, `application/json`):
```json
{
  "cleaned_text": "...",
  "nutrition_facts": {
    "serving_size": "30g",
    "calories": 120,
    "total_fat": "4g",
    "sodium": "200mg"
  },
  "ingredients": ["whole grain oats", "sugar", "salt"],
  "medical_nutrition_advice": [
    "High sodium content — monitor intake if hypertensive.",
    "Good source of dietary fibre."
  ]
}
```

---

### `POST /api/gemini/chat`

Non-streaming general-purpose chat. Waits for the full response before returning.

**Request body (simple message):**
```json
{ "message": "How many calories should I eat daily?", "userProfile": { ... } }
```

**Request body (multi-turn):**
```json
{ "messages": [{ "role": "system", "content": "..." }, { "role": "user", "content": "..." }] }
```

**Response:** `text/plain` (assistant reply text) or JSON when the model returns structured data.

---

### `POST /api/gemini/chat/stream`

**Streaming** version of the chat endpoint. Checks for upstream errors before committing to stream — returns proper HTTP error codes on failure (e.g. `429` for rate limits).

**Request body:** Same as `/api/gemini/chat`.

**Response:** `text/plain; charset=utf-8` with incremental text chunks as they arrive from the AI provider. Clients read via `ReadableStream`.

**Error responses** (returned before streaming starts):
| Status | Meaning |
|---|---|
| `400` | Missing `message` or `messages` in body |
| `429` | Upstream rate limit / quota exceeded |
| `502` | Upstream AI provider error |
| `503` | API key not configured on server |

---

### `GET /health`

```json
{ "status": "ok", "service": "poshanix-ai-proxy" }
```

---

## Deployment

### Frontend — Vercel

1. Import the GitHub repo into Vercel.
2. **Framework preset:** Vite (auto-detected).
3. **Build command:** `npm run build` | **Output dir:** `dist`.
4. Add all `VITE_FIREBASE_*` variables in **Settings → Environment Variables**.
5. Leave `VITE_AI_API_BASE` unset — it will fall back to the Render URL.
6. `vercel.json` handles SPA routing (all paths rewrite to `index.html`).

### Backend — Render

1. Create a new **Web Service** pointing to the `server/` directory.
2. **Build command:** `npm install` | **Start command:** `node index.js`.
3. Add all server environment variables in the Render dashboard.
4. The free tier spins down after inactivity — first request may be slow (~30 s cold start).

---

## Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/` | `Landing` (in App.tsx) | Marketing landing page with feature carousel and how-it-works section |
| `/auth` | `Auth.tsx` | Sign in / sign up with Firebase Auth |
| `/onboarding` | `Onboarding.tsx` | First-time profile setup (age, weight, height, goals, allergies) |
| `/home` | `Home.tsx` | Dashboard: BMI/BMR cards, daily tip, label scanner, saved analyses |
| `/food` | `Food.tsx` | AI-parsed nutrition results, health score, charts, ingredient list, food chat |
| `/profile` | `Profile.tsx` | View and edit user health profile |
| `/privacy` | `Privacy.tsx` | Privacy Policy |
| `/terms` | `Terms.tsx` | Terms of Service |

---

## Key Components

### `ChatWidget.tsx`
- Floating chat button (bottom-right corner) available on all authenticated pages
- Sends questions to `/api/gemini/chat/stream` with the user's health profile as context
- Responses stream token-by-token into the message bubble in real time
- Suggestion chips for common questions when the chat is empty

### `FoodChatWidget.tsx`
- Appears on the Food page after a scan is complete
- Builds a rich system prompt from the scanned product's nutrition facts, ingredients, health score, and AI insight summary
- Uses the same streaming endpoint for real-time responses

### `Carousel.tsx`
- 3D perspective carousel with spring physics drag, autoplay, and infinite loop
- Used on the landing page to showcase app features

### `RotatingText.tsx`
- Animated word-cycling text component used in the hero headline

### `Switch.tsx`
- Dark/light theme toggle, persisted via `localStorage`

---

## Firebase Schema

### Firestore — `profiles/{uid}`

```ts
{
  uid: string
  email: string
  displayName: string
  age?: number
  gender?: string
  weight?: number
  weight_unit?: 'kg' | 'lbs'
  height?: number
  height_unit?: 'cm' | 'ft'
  bmi?: number
  bmr?: number
  water_intake?: string       // e.g. "2L"
  eating_habits?: string      // e.g. "balanced_diet"
  food_allergies?: string     // comma-separated
  workout_level?: string      // e.g. "moderate"
  onboardingComplete?: boolean
  createdAt: Timestamp
}
```

### Firestore — `profiles/{uid}/analyses/{id}`

```ts
{
  id: string
  createdAt: Timestamp
  imageSrc?: string           // base64 or Storage URL
  ocrText: string
  parsed: {
    cleaned_text: string
    nutrition_facts: Record<string, any>
    ingredients: string[]
    medical_nutrition_advice: string[]
    health_score?: number
  }
  aiInsight?: string
}
```

---

## Scripts

Run from the project root:

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
```

Run from `server/`:

```bash
npm start         # Start Express AI proxy (http://localhost:3001)
```

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes and ensure `npm run build` passes with no errors.
3. Open a pull request with a clear description of what changed and why.
4. For bugs, please include steps to reproduce and the expected vs actual behaviour.

---

## License

MIT © [Poshanix](https://github.com/vabxic/Poshanix)

---

*Last updated: March 7, 2026*

