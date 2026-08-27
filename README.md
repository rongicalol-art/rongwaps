# 🧧 RongWaps — Playful Chinese (TOCFL/HSK) Study Tool

> A playful, interactive Chinese learning application featuring Duolingo-style aesthetics, spaced repetition study (SRS), and character decomposition trees.

---

## 🚀 Features

- **Spaced Repetition System (SRS)**: Smart card scheduling based on user performance.
- **Interactive Character Breakdown**: Visual decomposition of Chinese characters into their sub-radicals and components.
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
- **Animations / Styling**: Hanzi Writer (Stroke orders) + Lottie React (Celebrations)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Server Config
PORT=3000

# Supabase Configurations
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Server-side use only (KEEP SECRET)

# Optional: local, approval-gated memory-hook pilot generation
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

3. Open your browser and navigate to `http://localhost:3000`.

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
