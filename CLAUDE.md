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
A pure in-memory JSON database backed by `localStorage` under the key `crm_db`. The in-memory object `db` is the single source of truth; every mutation calls `saveDB()` which serializes back to localStorage. IDs are auto-incremented integers tracked in `db._nextIds`. Migrations run inside `initDB()` on load — always add new tables there via `if (!db.x) { db.x = []; db._nextIds.x = 1; }`.

**Schema tables:** `agencies`, `creators`, `daily_earnings`, `tasks`, `brain_dump`, `chatters`, `payroll_records`, `teams`, `team_members`, `team_chatters`, `team_schedules`, `team_day_notes`.

Key task functions: `createAgencyTask` (preferred — includes `agency_id` and `priority`), `getAllTasksEnriched` (joins creator/agency names), `updateAgencyTask` (field-whitelist update).

Key payroll functions: `upsertPayrollRecord` (creates or updates, recalculates derived fields), `getPayrollHistory` (returns distinct periods with `record_count` and `total_net_pay` metadata), `deletePayrollRecordsForPeriod`.

Key team functions: `createTeam` / `updateTeam` / `deleteTeam` (cascade-deletes all junction + schedule rows), `addCreatorToTeam` / `addChatterToTeam` (no-op if duplicate), `upsertScheduleEntry` (keyed on `team_id + date + shift_index`), `upsertDayNote` (keyed on `team_id + date`).

The HOTTTR Report Builder (`public/HOTTTR_Report_Builder.html`) uses a **separate** localStorage key `hotttr_v2` — no conflict with `crm_db`.

### State Layer (`src/store.js`)
Zustand store with a flat shape. All React components read state via `useStore(state => state.xxx)` — never import from `db/index.js` directly in components. Actions call `db/*` then update Zustand state optimistically.

`loadAllData()` runs once on boot and hydrates: `agencies`, `creators`, `chatters`, `tasks`, `bookmarkedTasks`, `teams`, `teamMembers`, `teamChatters`.

**Schedule state** (`teamSchedule`, `teamDayNotes`) is NOT loaded on boot — it's loaded on-demand by `loadTeamSchedule(teamId, dateFrom, dateTo)` when the Team view mounts or the viewed week changes.

**Payroll period** is stored as `{ periodStart: 'YYYY-MM-DD', periodEnd: 'YYYY-MM-DD' }` — no year/month/half fields.

### Routing
View routing is purely state-based: `currentView` in the Zustand store drives which component renders in `App.jsx`. No React Router. Valid view IDs: `dashboard`, `revenue-master`, `tasks`, `team`, `brain-dump`, `reports`, `payroll`.

### Views (`src/components/views/`)
| File | View ID | Notes |
|------|---------|-------|
| `Dashboard.jsx` | `dashboard` | |
| `RevenueMaster.jsx` | `revenue-master` | |
| `Tasks.jsx` | `tasks` | |
| `Team.jsx` | `team` | Teams + shift schedule + member assignment |
| `BrainDumpSpace.jsx` | `brain-dump` | |
| `Reports.jsx` | `reports` | `<iframe src="/HOTTTR_Report_Builder.html">` |
| `Payroll.jsx` | `payroll` | Calendar picker, inline editing, team filter |

### Teams System
Teams are a grouping layer within agencies. The data model uses junction tables:
- `teams` — stores name, color (CSS token string e.g. `'accent-cyan'`), notes, and `shifts` (JSON array of `{ label, color }` objects directly on the record).
- `team_members` / `team_chatters` — many-to-many junctions (no duplicates enforced in db layer).
- `team_schedules` — one row per `(team_id, date, shift_index)` storing `chatter_id` + `is_cover`.
- `team_day_notes` — one row per `(team_id, date)` for free-text notes.

### Payroll System
Payroll is period-based (any arbitrary `periodStart`/`periodEnd` YYYY-MM-DD range). `generatePayroll` iterates all agencies → creators + chatters, calling `upsertPayrollRecord` which auto-calculates `commission_amount`, `hourly_amount`, `gross_pay`, `net_pay`. The Payroll view supports inline editing of any numeric field (click to edit, Enter/blur to commit), status cycling (pending → approved → paid), individual record delete, and full period delete. History is shown as a collapsible list with per-period record count and total payout.

### Design System (Tailwind tokens)
Custom spacing scale (do not use arbitrary pixel values):
`xs=4px  sm=8px  md=12px  lg=16px  xl=24px  2xl=32px`

Color tokens:
```
bg-primary / bg-secondary / bg-tertiary       (dark backgrounds)
text-primary / text-secondary / text-tertiary
accent-cyan / accent-purple / accent-pink / accent-lime / accent-orange / accent-blue
```

For dynamic colors (e.g. team color pickers), use inline `style={{ backgroundColor: hex }}` rather than constructing Tailwind class names at runtime — dynamic class names are not purged reliably. Store color tokens as the CSS-token string (`'accent-cyan'`) and maintain a local hex map for inline styles.

Shadow utilities: `shadow-glow`, `shadow-glow-purple`, `shadow-glow-pink`, `shadow-glow-lime`.

Animation utilities: `animate-pulse-glow`, `animate-float`, `animate-slide-up`, `animate-fade-in`, `animate-scale-in`.

The glassmorphism pattern used throughout: `bg-white/5 backdrop-blur-md border border-white/10 rounded-xl`.

### Report Builder (`public/HOTTTR_Report_Builder.html`)
Standalone vanilla-JS HTML file served statically by Vite. Contains all its own CSS and JavaScript inline. The "Import from CRM" button reads `crm_db` from localStorage to pull active creators. Since the iframe and the CRM share the same origin (`localhost:5173`), localStorage is fully shared.
