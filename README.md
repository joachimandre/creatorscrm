# Creator CRM - OnlyFans Manager

A lightweight, personal CRM and multi-agency revenue tracker for OnlyFans managers. Built with React, Tailwind CSS, and SQLite (via SQL.js).

## Features

### 📊 Dashboard (Multi-Panel Hub)
- **Bookmarked Tasks**: Pin important tasks with a star for quick access
- **Agency/Creator Directory**: Browse all your agencies and creators, grouped hierarchically
- **Creator Workspace**: View tasks and notes for selected creators

### 💰 Revenue Master Sheet
- **Spreadsheet-style grid**: Track daily, weekly, and monthly earnings
- **Conditional formatting**: Cells color-code based on performance vs. goals (🟢 green for on-target, 🟡 yellow for near-miss, 🔴 red for below-goal)
- **Offboarded creators**: Collapsed section for inactive creators to keep the main view clean
- **Agency reports**: One-click copy buttons to generate text summaries for agency communication

### 📝 Daily Income Input
- **Quick 5-minute routine**: Input daily earnings for all active creators grouped by agency
- **Tab-friendly**: Hit Tab to move between creators, submit all at once
- **Auto-calculated total**: See your daily total in real-time

### 🧠 Brain Dump Space
- **Personal notes**: Dump thoughts, ideas, reminders without interrupting workflow
- **Quick capture FAB**: Floating action button for instant idea capture
- **Auto-save**: Notes save on blur, no manual saving required

## Tech Stack

- **Frontend**: React 18 + Tailwind CSS 3
- **Database**: SQLite via SQL.js (runs in-browser, persists to localStorage)
- **State Management**: Zustand
- **Build Tool**: Vite
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173` (auto-opens in browser).

### Build for Production

```bash
npm run build
```

Output is in `dist/` directory.

## Database Schema

### Agencies
- `id` (PK)
- `name` (unique)
- `notes`
- `created_at`, `updated_at`

### Creators
- `id` (PK)
- `stage_name`
- `agency_id` (FK)
- `daily_goal`, `weekly_goal`, `monthly_goal`
- `is_active` (boolean for offboarding)
- `notes`
- `created_at`, `updated_at`

### Daily Earnings
- `id` (PK)
- `creator_id` (FK)
- `date`
- `amount`
- `created_at`, `updated_at`

### Tasks
- `id` (PK)
- `creator_id` (FK, nullable for general tasks)
- `title`, `description`
- `due_date`
- `status` ('upcoming', 'in_progress', 'review')
- `is_bookmarked` (boolean for pinned tasks)
- `created_at`, `updated_at`

### Brain Dump (Personal Notes)
- `id` (PK)
- `creator_id` (FK, nullable for general notes)
- `content`
- `created_at`, `updated_at`

## Design Philosophy

- **Minimal & Dark**: Clean dark theme (#0f172a background) with professional color palette
- **Operational Focus**: Every UI element serves a purpose; no unnecessary decoration
- **Low Cognitive Load**: Information density is balanced for quick scanning and data entry
- **Speed Over Fluff**: Tab navigation, keyboard shortcuts, auto-save, and quick actions prioritize efficiency

### Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Surface-0 | `#0f172a` | Main background |
| Surface-1 | `#1e293b` | Cards, panels |
| Surface-2 | `#334155` | Hover, dividers |
| Text-Primary | `#f1f5f9` | Headings, main content |
| Text-Secondary | `#cbd5e1` | Secondary labels |
| Text-Tertiary | `#94a3b8` | Helper text, timestamps |
| Accent-Primary | `#3b82f6` | CTA, active states (blue) |
| Accent-Success | `#10b981` | Goals met, positive metrics (green) |
| Accent-Warning | `#f59e0b` | Near miss, attention (amber) |
| Accent-Danger | `#ef4444` | Below goal, delete (red) |

### Typography

- **Display/Headings**: Inter 600-700 (28-24px)
- **Body**: Inter 400 (14-16px), line-height 1.5
- **Labels/Captions**: Inter 500 (12-13px)
- **Monetary Values**: JetBrains Mono 400 (13px, tabular figures)

## Usage Tips

### Daily Workflow
1. Open **Daily Income Input**
2. Select the date (defaults to today)
3. Type earnings for each creator (use Tab to navigate)
4. Click "Submit Daily Earnings"

### Weekly Check-in
1. Open **Revenue Master Sheet**
2. Filter by agency (optional)
3. Check performance vs. goals (green/yellow/red cell highlighting)
4. Click agency buttons to copy reports for stakeholder messaging

### Quick Task Management
1. Click the **+** FAB button to capture ideas
2. Pin important tasks with the star icon on the dashboard
3. Manage creator-specific tasks in their workspace

## Data Persistence

All data is stored in the browser's `localStorage` via SQL.js. This means:

✅ **Advantages**:
- Works completely offline
- No server required
- Full privacy (your data stays on your computer)
- Instant saves

⚠️ **Considerations**:
- Data persists only in this browser on this computer
- Clearing browser data will delete everything
- Export regularly if you want backups (future feature)

## Future Enhancements

- [ ] Export data to CSV
- [ ] Email reports to agencies
- [ ] Creator performance alerts
- [ ] Recurring task templates
- [ ] Dark/light mode toggle
- [ ] Mobile app version (React Native)
- [ ] Cloud sync (optional)

## License

Personal use only.

---

**Built with care for OnlyFans managers. Operational utility first, visual fluff never.** ✨
