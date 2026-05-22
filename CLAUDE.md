# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at localhost:5173 (must restart after PC shutdown)
npm run build     # Production build → dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint on src/
```

## Architecture Overview

### Stack
React 18 + Vite + Zustand + Tailwind CSS + Recharts. No backend — all data lives in the browser's `localStorage`.

### Data Layer (`src/db/index.js`)
A pure in-memory JSON database backed by `localStorage` under the key `crm_db`. The in-memory object `db` is the single source of truth; every mutation calls `saveDB()` which serializes back to localStorage. IDs are auto-incremented integers tracked in `db._nextIds`. Migrations run inside `initDB()` on load.

Schema tables: `agencies`, `creators`, `daily_earnings`, `tasks`, `brain_dump`, `chatters`.

Key task functions: `createAgencyTask` (preferred for new tasks — includes `agency_id` and `priority`), `getAllTasksEnriched` (joins creator/agency names), `updateAgencyTask` (field-whitelist update).

The HOTTTR Report Builder (`public/HOTTTR_Report_Builder.html`) uses a **separate** localStorage key `hotttr_v2` — no conflict with `crm_db`.

### State Layer (`src/store.js`)
Zustand store with a flat shape. All React components read state via `useStore(state => state.xxx)` — never import from `db/index.js` directly in components. The store exposes both raw state (`agencies`, `creators`, `tasks`, etc.) and CRUD actions that call `db/*` then update the in-memory Zustand state optimistically.

`loadAllData()` is called once on app boot after `initDB()` resolves.

### Routing
View routing is purely state-based: `currentView` in the Zustand store drives which component renders in `App.jsx`. No React Router. Valid view IDs: `dashboard`, `revenue-master`, `tasks`, `team`, `brain-dump`, `reports`.

### Views (`src/components/views/`)
| File | View ID |
|------|---------|
| `Dashboard.jsx` | `dashboard` |
| `RevenueMaster.jsx` | `revenue-master` |
| `Tasks.jsx` | `tasks` |
| `Team.jsx` | `team` |
| `BrainDumpSpace.jsx` | `brain-dump` |
| `Reports.jsx` | `reports` — renders an `<iframe src="/HOTTTR_Report_Builder.html">` |

### Design System (Tailwind tokens)
Custom spacing scale (do not use arbitrary pixel values):
`xs=4px  sm=8px  md=12px  lg=16px  xl=24px  2xl=32px`

Color tokens:
```
bg-primary / bg-secondary / bg-tertiary       (dark backgrounds)
text-primary / text-secondary / text-tertiary
accent-cyan / accent-purple / accent-pink / accent-lime / accent-orange / accent-blue
```

Shadow utilities: `shadow-glow`, `shadow-glow-purple`, `shadow-glow-pink`, `shadow-glow-lime`.

Animation utilities: `animate-pulse-glow`, `animate-float`, `animate-slide-up`, `animate-fade-in`, `animate-scale-in`.

The glassmorphism pattern used throughout: `bg-white/5 backdrop-blur-md border border-white/10 rounded-xl`.

### Report Builder (`public/HOTTTR_Report_Builder.html`)
Standalone vanilla-JS HTML file served statically by Vite. Contains all its own CSS and JavaScript inline. The "Import from CRM" button reads `crm_db` from localStorage to pull active creators. Since the iframe and the CRM share the same origin (`localhost:5173`), localStorage is fully shared.
