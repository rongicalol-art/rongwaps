# 🧧 RongWaps — Playful Chinese (TOCFL/HSK) Study Tool

> A playful, interactive Chinese learning application featuring Duolingo-style aesthetics, spaced repetition study (SRS), character decomposition trees, and AI-generated mnemonics.

---

## 🚀 Features

- **Spaced Repetition System (SRS)**: Smart card scheduling based on user performance.
- **Interactive Character Breakdown**: Visual decomposition of Chinese characters into their sub-radicals and components.
- **AI Memory Hooks (Mnemonics)**: On-demand and pre-generated stories/mnemonics powered by Gemini Flash to help users retain characters.
- **Multiple Study Modes**:
  - 🎴 **Flashcards**: Drag-to-swipe card review with stroke order animations.
  - ✍️ **Writing Mode**: Active canvas writing integration.
  - 👂 **Listening Mode**: Audio playback and comprehension checks.
  - 🧠 **Quiz Mode**: Interactive multiple-choice testing.
- **Cloud Sync**: Automated synchronization of local study progress with Supabase.
- **Responsive Layout**: Designed with a custom 3D tactile interface and playful CSS animations.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Motion (Framer Motion)
- **Backend / API**: Node.js + Express + TypeScript (`tsx`)
- **Database / Auth**: Supabase (PostgreSQL) + Row-Level Security (RLS)
- **AI Services**: Google Gemini API via `@google/genai`
- **Animations / Styling**: Hanzi Writer (Stroke orders) + Lottie React (Celebrations)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Server Config
PORT=3000

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
CUSTOM_GEMINI_KEY=your_backup_gemini_api_key

# Supabase Configurations
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Used for backend script generation only (KEEP SECRET)

# OpenRouter Fallback API (Optional)
OPENROUTER_API_KEY=your_openrouter_key
```

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Run the application in development mode:
   ```bash
   npm run dev
   ```
   *This starts both the Express server API and Vite dev server under `server.ts`.*

3. Open your browser and navigate to `http://localhost:5173`.

---

## 📂 Project Structure

```
rongwaps/
├── docs/                       # Architecture, database schema, and roadmap docs
├── scripts/                    # Automation, mnemonic batch generation, and DB hooks
├── src/
│   ├── assets/                 # Lottie animations and images
│   ├── data/                   # Static curriculums and themes
│   ├── hooks/                  # Global React hooks
│   ├── lib/
│   │   └── widgets/            # Reusable Duolingo-styled UI widgets
│   ├── screens/                # Core screen views (Library, Flashcard, Quiz, etc.)
│   ├── services/               # API client and Supabase services layer
│   ├── store/                  # Zustand state management slices
│   ├── types/                  # Database and application types
│   └── utils/                  # formatting, caching, and SRS logic helpers
├── supabase/                   # Supabase migrations and database configuration
├── server.ts                   # Express server acting as API endpoint & web server
└── vite.config.ts              # Vite configuration
```

---

## 🏗️ Deployment

The application is deployed on **Render** (linked to the `main` branch) and connects to a production **Supabase** instance.

- Deployment configuration is defined in `render.yaml`.
- Production bundle is built using `npm run build`.
