## 2026-09-04T16:08:23Z
You are worker_m2 for the RongWaps fresh-foundation cleanup project.
Your identity: worker_m2
Your working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/worker_m2
Parent orchestrator conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b

Authoritative user request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md
Survey findings: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2/survey_report.md
Survey handoff: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2/handoff.md
Project document: /Users/ronianb.gica/Projects/rongwaps/.agents/orchestrator_1/PROJECT.md

Your mission: Execute Milestone 2: Dead Dependencies & Dead Code Removal (R2) and Server Restructuring (R6).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Dead Dependencies & package.json / vite.config.ts cleanup:
   - In package.json, remove: "lucide-react", "swiper", "axios", "autoprefixer", "@tanstack/react-virtual".
   - In package.json, move "@tailwindcss/vite" and "@vitejs/plugin-react" from "dependencies" to "devDependencies".
   - In package.json, rename "name" from "react-example" to "rongwaps".
   - In vite.config.ts, remove 'lucide-react' from manualChunks.vendor.
   - Run npm install to regenerate package-lock.json.
2. Ghost Directories:
   - Delete empty directories:
     src/screens/grammar-quest/components
     src/screens/grammar-quest/hooks
     src/screens/grammar-quest
     src/screens/grammar-lesson/lesson-one-part-one
     src/screens/grammar-lesson/lesson-one-part-two
     src/screens/grammar-lesson/lesson-two-part-one
     src/screens/grammar-lesson/lesson-two-part-two
     src/screens/grammar-lesson/lesson-five-part-two
     src/screens/grammar-lesson/lesson-eleven-part-one
     src/screens/grammar-lesson/lesson-fourteen-part-one
3. Phantom Stores:
   - Copy and export `interface UserSnapshot { id: string; email: string; name?: string; avatar_url?: string; }` into src/store/useAppStore.ts.
   - Delete the 6 phantom stores: src/store/useAuthStore.ts, useNavigationStore.ts, useSrsStore.ts, useUiStore.ts, useLibraryStore.ts, useSyncStore.ts.
   - In src/store/useAppStore.ts, remove all re-export statements for those 6 stores.
   - In src/hooks/useAuth.ts, update UserSnapshot import to import from '../store/useAppStore'.
4. Orphaned Components & Dead Code:
   - Delete src/screens/library/VirtualizedList.tsx and src/screens/library/CollectionListItem.tsx.
   - Delete src/screens/library/components/LibraryContinueCard.tsx.
   - In MemoryHookCharacter.tsx, BreakdownExpandPanel.tsx, and DebugWindow.tsx: change imports from aiService to import getMnemonic/saveMnemonic from src/services/mnemonicCache.
   - Delete src/services/aiService.ts.
   - In src/index.css, remove @keyframes popIn and .anim-pop.
5. Server Restructuring (R6):
   - Create server/ directory.
   - Move server.ts from project root to server/index.ts.
   - In server/index.ts, update import of supabase: `import { supabase } from "../src/services/supabaseClient.js";`.
   - In package.json, update scripts:
     "server": "tsx server/index.ts",
     "build:server": "esbuild server/index.ts --platform=node --bundle --outfile=dist/server.js --format=esm --external:express --external:@supabase/supabase-js --external:dotenv --external:cors",
     "lint": "eslint src tests server/index.ts vite.config.ts --max-warnings=0"
6. Verification:
   - npm ls --depth=0 lucide-react swiper axios autoprefixer @tanstack/react-virtual
   - grep -r "lucide-react\|swiper\|axios" src/ vite.config.ts (must return 0 matches)
   - find src -type d -empty (must return 0 empty dirs)
   - Confirm server.ts does NOT exist at project root; server/index.ts exists.
   - npm run lint (0 errors, 0 warnings)
   - npm test (all tests pass; acceptance tests for dependencies and server should now pass!)
   - npm run build (clean build, produces dist/ and dist/server.js)
7. Write your completion report in /Users/ronianb.gica/Projects/rongwaps/.agents/worker_m2/handoff.md following the 5-component format.
Update progress.md as you work.
When done, notify parent (conversation ID 3c2faab7-8d44-4972-82e9-ff93d6a3845b) via send_message.
