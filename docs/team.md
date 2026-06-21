# TOCFL Study App — Team Documentation

---

## 1. Team Structure

### 1.1 Roles

| Role | Who | Responsibility |
|------|-----|---------------|
| **CEO** | Ron (You) | Set direction, approve plans, make final decisions, learn from docs |
| **Lead** | OWL (Me) | Plan, coordinate, review work, report to Ron. Ron only talks to me. |
| **Workers** | Sub-agents | Execute specific tasks. Report to me, not to Ron. |

### 1.2 How Work Flows

1. Ron approves a plan (or I suggest one and he greenlights it)
2. I break it into tasks and put them on the Kanban board
3. I spawn worker agents to do the coding
4. Workers report back to me
5. I review and test their work
6. I push clean code to GitHub
7. I update the Kanban board and documentation
8. I report to Ron

---

## 2. Workers

### 2.1 Worker Models

All workers use free models from OpenRouter. All tested and confirmed working.

| Worker | Model | Strength | Use Case |
|--------|-------|----------|----------|
| **Frontend** | `poolside/laguna-m.1:free` | Coding agent, software engineering | UI components, Tailwind styling, responsive design |
| **Backend (Architecture)** | `nvidia/nemotron-3-super-120b-a12b:free` | Massive context (1M), codebase mapping | Reading full codebase, understanding route connections, structural analysis |
| **Backend (Queries)** | `openai/gpt-oss-120b:free` | Fast, precise coding | Individual API queries, migrations, small backend fixes |
| **Researcher** | `nvidia/nemotron-3-ultra-550b-a55b:free` | Deep reasoning, analysis | Investigate best practices, validate approaches before building |
| **QA/Testing** | `z-ai/glm-4.5-air:free` | Agent-centric, edge case detection | Test features, find bugs, verify functionality |
| **Documentation** | `meta-llama/llama-3.3-70b-instruct:free` | Clear writing, instruction following | Write and update docs as we build |

### 2.2 Worker Responsibilities

**Frontend Worker:**
- Build UI components in `src/lib/widgets/`
- Implement Tailwind styling following Duolingo-style design rules
- Make screens responsive (mobile + tablet)
- Follow component structure: max 150 lines per file
- Model: poolside/laguna-m.1:free (coding agent, not general chat)

**Backend Architecture Worker:**
- Read and map the full codebase structure
- Understand how routes, services, and hooks connect
- Analyze Supabase schema and table relationships
- Plan structural changes before any code is written
- Model: nvidia/nemotron-3-super-120b-a12b:free (1M context for full codebase ingestion)

**Backend Query Worker:**
- Write individual Supabase queries and API routes in `src/services/`
- Handle migrations, small fixes, and targeted backend changes
- Never expose Supabase client to UI layer
- Model: openai/gpt-oss-120b:free (fast, precise for small tasks)

**Researcher Worker:**
- Before we build a feature, research how top apps do it
- Find proven patterns, common pitfalls, real examples
- Report findings to me so we build the right thing the first time
- Validate tech choices (libraries, approaches, architecture)
- Model: nvidia/nemotron-3-ultra-550b-a55b:free

**QA/Testing Worker:**
- After a feature is built, test it thoroughly
- Find bugs, edge cases, broken flows
- Check responsive design on different screen sizes
- Report issues to me before Ron sees anything broken
- Model: z-ai/glm-4.5-air:free

**Documentation Worker:**
- Write clear docs for every feature we build
- Keep `docs/team.md` updated
- Document new widgets in `WIDGETS.md` (per AGENTS.md rules)
- Make sure Ron can read and learn from the docs
- Model: meta-llama/llama-3.3-70b-instruct:free

---

## 3. Communication

### 3.1 Daily Check-ins (Automated)

| Time (Taiwan GMT+8) | Type | Content |
|---------------------|------|---------|
| 7:00 AM | Morning | What I plan to do today |
| 12:00 PM | Midday | Progress update since morning |
| 5:00 PM | Evening | What's done, what's next, any blockers |

Delivered to: Hermes Desktop App + Telegram

### 3.2 On-Demand Reports

- When a feature is completed
- When something is blocked
- When I need Ron's decision
- Anytime Ron asks me anything

### 3.3 Communication Channels

| Channel | Purpose |
|---------|---------|
| **Hermes Desktop App** | Main hub. Chat, Kanban board, updates |
| **Telegram** | Check-ins on the go |
| **GitHub Repo** | Code + documentation. Readable anytime |

---

## 4. Kanban Board

Located in Hermes Desktop App under the Kanban tab.

**Board name:** tocfl

### 4.1 Columns

| Column | Meaning |
|--------|---------|
| **Backlog** | Ideas and future work |
| **To Do** | Approved and ready to start |
| **In Progress** | Being worked on |
| **Review** | Done, waiting for my review |
| **Done** | Completed and merged to GitHub |

### 4.2 Current Tasks

- Set up Google Sign-In authentication
- Build flashcard progress tracking system
- Build personal vocab library feature
- Set up memory hooks (pre-generate mnemonics in Supabase)
- Make app mobile and tablet responsive
- Set up proper user data saving with auth

---

## 5. Principles

- **No fake updates.** If nothing happened, I'll say so.
- **No deleting anything without asking Ron first.**
- **Clean code over clever code.** Ron needs to be able to read and learn from it.
- **Build fast, but build right.** The researcher helps us avoid dead ends.
- **Ron is the CEO.** I work for him. The workers work for me.
- **All code follows AGENTS.md rules** (Duolingo design, component structure, state management).

---

## 6. Progress Log

### 2026-06-06 — Foundation
- Set up Kanban board (tocfl) in Hermes
- Created team documentation (this file)
- Configured 3 daily check-ins (7am, 12pm, 5pm Taiwan time)
- Tested and confirmed all 5 worker models on OpenRouter (all free)
- Set up cron jobs for automated check-ins

### 2026-06-07 — Auth Hardening
- Researched Google Sign-In + Supabase best practices (researcher model: gpt-oss-120b:free)
- Added `upsertProfile()` to authService — auto-creates user profile row on first login
- Added `refreshSession()` to authService — proactive token refresh
- Updated useAuth hook to call upsertProfile on sign-in
- Added refreshSession to useAuth exports for components to use
- TypeScript build: zero errors

### 2026-06-07 — Worker Model Optimization
- Split Backend into two roles: Architecture (Nemotron 3 Super, 1M context) and Queries (gpt-oss-120b:free, fast)
- Swapped QA to GLM 4.5 Air (better edge case detection)
- Swapped Documentation to Llama 3.3 70B (better instruction following for docs)
- Each worker now has a unique model — no rate limit sharing, no context contamination
- Updated team.md with new model assignments and responsibilities

---

## 7. Project Info

| Detail | Value |
|--------|-------|
| **Repo** | rongwaps (GitHub) |
| **Local path** | /Users/ronianb.gica/Projects/rongwaps |
| **Dev server** | npx tsx server.ts (port 3000) |
| **Stack** | React + Tailwind + Supabase + Gemini API |
| **Design** | Duolingo-style, playful, gamified |
| **Target** | Ready for new first-years by September |
| **Budget** | $0 (all free tiers and free models) |

---

*Last updated: 2026-06-06*
*This doc grows as we build. Check back after each feature.*
