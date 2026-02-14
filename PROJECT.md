# Campaign Hub

## What This Project Does

Campaign Hub is a web-based dashboard for tabletop RPG game masters. It lets you manage all the moving pieces of a campaign — NPCs, locations, lore, rules, ships, factions, player characters, session notes, story artefacts, and more — from a single interface. It also supports live play sessions with initiative tracking, dice rolling, and a tactical board.

There are two access modes:
- **DM mode** — Full read/write access to everything. This is where you build and run your campaign.
- **Player mode** — Read-only access to content the DM has made visible. Players connect remotely (typically via a Cloudflare Tunnel) and can view their characters, the world, and participate in live sessions.

All campaign data is stored as markdown files with YAML frontmatter — plain text you can read, edit, and version-control outside the app.

---

## How It Works

### Architecture Overview

The app has three main layers:

1. **Express API server** (port 3001) — Handles all data operations: reading/writing markdown files, managing campaigns, processing image uploads, authenticating users, and serving the API.

2. **React frontend** (port 5173 in dev) — A single-page app that provides the DM dashboard and player views. Communicates with the server exclusively through REST API calls.

3. **File-based storage** — All campaign content lives in the `campaigns/` directory as markdown files with YAML frontmatter. No database. The server watches for file changes and rebuilds its in-memory indexes when files change on disk.

### Module System

Features are organized as **modules** — self-contained plugins that register themselves with the app. Each module provides:
- Server-side routes (API endpoints)
- Client-side views (React components for list, detail, and edit pages)
- A Zod schema (for validating the YAML frontmatter in its markdown files)
- A data folder name (where its files live within a campaign directory)

The dashboard shell knows nothing about individual module internals. Adding a new module doesn't require changing the core framework.

**Current modules:** NPCs, Locations, Lore, Rules, Player Characters, Ships, Factions, Projects (clocks), Session Notes, Story Artefacts, Tactical Board, Live Play

### DM vs. Player Access

Authentication uses simple password-based sessions (configured in `.env`). The server maintains separate route sets:
- DM routes (`/api/campaigns/...`, `/api/modules/...`) — full CRUD
- Player routes (`/api/player/...`) — read-only, with content filtering that strips out DM-only entries and hidden fields

### Live Play & Polling

There's no WebSocket layer. Live play features (initiative tracker, dice rolls, scene management) use **polling** — the client checks for updates every 1 second. This keeps the architecture simple with near-instant updates for players.

---

## File Map

```
campaign-hub/
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript config (shared)
├── tsconfig.server.json            # TypeScript config (server build)
├── vite.config.ts                  # Vite dev server and build config
├── tailwind.config.js              # Tailwind CSS configuration
├── .env                            # Environment variables (passwords, API keys, ports)
├── campaign-hub-architecture.md    # Original architecture design spec
├── PROJECT.md                      # This file
├── CHANGELOG.md                    # Session-by-session change log
│
├── app/
│   ├── server/
│   │   ├── index.ts                # Express app entry point — all route mounting, middleware, static file serving
│   │   ├── config.ts               # Environment variable loading and defaults
│   │   │
│   │   ├── core/                   # Framework-level utilities (not module-specific)
│   │   │   ├── auth-middleware.ts   # Session auth: login, logout, token generation, role guards
│   │   │   ├── campaign-manager.ts # Campaign CRUD: create, load, list, activate, delete
│   │   │   ├── content-filter.ts   # Filters DM-only content from player responses
│   │   │   ├── file-lock.ts        # Prevents concurrent writes to the same file
│   │   │   ├── file-store.ts       # Generic CRUD for markdown files with frontmatter
│   │   │   ├── file-watcher.ts     # Watches campaign directories for external changes (chokidar)
│   │   │   ├── markdown-parser.ts  # Parses/serializes markdown + YAML frontmatter (gray-matter)
│   │   │   ├── relationship-index.ts # Builds and queries a graph of cross-references between files
│   │   │   ├── upload-handler.ts   # Image upload processing with Sharp (resize, optimize, thumbnails)
│   │   │   └── validation.ts       # Request validation helpers using Zod schemas
│   │   │
│   │   ├── modules/                # Feature modules (each is a self-contained plugin)
│   │   │   ├── registry.ts         # Module registration and route mounting
│   │   │   ├── base-routes.ts      # Factory that generates standard CRUD routes for a module
│   │   │   ├── npcs/               # NPC management + AI generation via Claude API
│   │   │   ├── locations/          # Location hierarchy + map generation + celestial fields
│   │   │   ├── lore/               # Lore entries
│   │   │   ├── rules/              # Game rules with categories and subcategories
│   │   │   ├── player-characters/  # Player characters with stats, gear, playbook moves
│   │   │   ├── ships/              # Ships with systems and crew
│   │   │   ├── factions/           # Factions with relationships
│   │   │   ├── projects/           # Projects/clocks (progress trackers)
│   │   │   ├── session-notes/      # Session notes
│   │   │   ├── story-artefacts/    # Story artefacts with image galleries
│   │   │   ├── tactical-board/     # Tactical board state (tokens, backgrounds, fog)
│   │   │   └── live-play/          # Live session: scenes, initiative, dice rolls, NPC/ship tracking
│   │   │
│   │   └── routes/
│   │       └── player-routes.ts    # All player-mode API endpoints (read-only, filtered)
│   │
│   ├── client/
│   │   ├── index.html              # HTML entry point
│   │   ├── main.tsx                # React DOM mount point
│   │   ├── App.tsx                 # Root component: routing, auth guards, providers
│   │   ├── index.css               # Global styles (Tailwind base)
│   │   │
│   │   ├── core/                   # App shell (layout, navigation, auth)
│   │   │   ├── Layout.tsx          # Main layout wrapper (sidebar + content area)
│   │   │   ├── Header.tsx          # Top bar: campaign selector, mode indicator, settings
│   │   │   ├── Sidebar.tsx         # Module navigation sidebar
│   │   │   ├── Dashboard.tsx       # Campaign overview / home page
│   │   │   ├── ModuleRouter.tsx    # Dynamic routing to module views
│   │   │   ├── LoginPage.tsx       # Login form
│   │   │   ├── Settings.tsx        # App settings page
│   │   │   ├── NoCampaignView.tsx  # Shown when no campaign is selected
│   │   │   ├── CreateCampaignDialog.tsx  # Campaign creation modal
│   │   │   └── providers/          # React context providers
│   │   │       ├── AuthProvider.tsx         # Auth state (login/logout, role, token)
│   │   │       ├── CampaignProvider.tsx     # Active campaign state
│   │   │       ├── ModeProvider.tsx         # DM/Player mode toggle
│   │   │       ├── QueryProvider.tsx        # TanStack Query setup
│   │   │       ├── InitiativeProvider.tsx   # Initiative tracker state
│   │   │       ├── SceneNPCsProvider.tsx    # Live scene NPC state
│   │   │       └── SceneShipsProvider.tsx   # Live scene ship state
│   │   │
│   │   ├── hooks/                  # Shared React hooks
│   │   │   ├── useCampaign.ts      # Shortcut to campaign context
│   │   │   └── useFiles.ts         # Generic file CRUD operations (wraps TanStack Query)
│   │   │
│   │   ├── components/             # Shared UI components
│   │   │   ├── MarkdownContent.tsx         # Renders markdown with custom styling
│   │   │   ├── InitiativeTracker.tsx       # Initiative order display and controls
│   │   │   ├── InitiativeEntry.tsx         # Single initiative entry row
│   │   │   ├── PortraitUpload.tsx          # Character portrait upload
│   │   │   ├── ImageUpload.tsx             # General image upload
│   │   │   ├── RelatedCharacterInput.tsx   # Autocomplete for character references
│   │   │   ├── LinkAutocomplete.tsx        # Autocomplete for internal links
│   │   │   ├── ErrorBoundary.tsx           # React error boundary
│   │   │   ├── CopyableId.tsx              # Click-to-copy ID display
│   │   │   └── ui/                         # Low-level UI utilities
│   │   │       ├── DynamicIcon.tsx         # Renders Lucide icons by name
│   │   │       └── cn.ts                   # Tailwind class merging helper
│   │   │
│   │   ├── modules/                # Module-specific UI (mirrors server/modules/)
│   │   │   ├── npcs/               # NPC list, detail, edit, AI generate views
│   │   │   ├── locations/          # Location list, detail, edit + map components
│   │   │   ├── lore/               # Lore list, detail, edit
│   │   │   ├── rules/              # Rules list, detail, edit
│   │   │   ├── player-characters/  # PC list, detail, edit + stats/gear/tracker components
│   │   │   ├── ships/              # Ship list, detail, edit + damage tracker
│   │   │   ├── factions/           # Faction list, detail, edit
│   │   │   ├── projects/           # Project list, detail, edit + clock visualization
│   │   │   ├── session-notes/      # Session notes list, detail, edit
│   │   │   ├── story-artefacts/    # Artefact list, detail, edit + image gallery
│   │   │   ├── tactical-board/     # Board canvas, tokens, fog, toolbar, minimap
│   │   │   └── live-play/          # Live play dashboard, scene panels, dice roller
│   │   │
│   │   └── player/                 # Player-mode views (read-only versions of module views)
│   │       ├── PlayerLayout.tsx    # Player-mode layout wrapper
│   │       ├── PlayerDashboard.tsx # Player home page
│   │       ├── Player*.tsx         # Player-mode list/detail/edit for each module
│   │       ├── components/         # Player-specific shared components
│   │       └── hooks/              # Player-specific hooks (usePlayerFiles.ts)
│   │
│   └── shared/                     # Code shared between server and client
│       ├── types/                  # TypeScript interfaces
│       │   ├── api.ts              # API request/response shapes
│       │   ├── campaign.ts         # Campaign config and metadata
│       │   ├── file.ts             # Parsed file and metadata types
│       │   ├── module.ts           # Module definition interface
│       │   ├── scene.ts            # Live scene types (NPCs, ships, dice)
│       │   └── initiative.ts       # Initiative tracker types
│       │
│       ├── schemas/                # Zod validation schemas (one per module)
│       │   ├── npc.ts, location.ts, lore.ts, rules.ts, player-character.ts,
│       │   │   ship.ts, faction.ts, project.ts, session-notes.ts,
│       │   │   story-artefact.ts, tactical-board.ts
│       │
│       └── utils/                  # Shared utility functions
│           ├── ids.ts              # ID generation (nanoid)
│           ├── dates.ts            # Date formatting helpers
│           └── paths.ts            # File path utilities
│
├── campaigns/                      # Campaign data (one folder per campaign)
│   └── {campaign-id}/
│       ├── campaign.yaml           # Campaign metadata and enabled modules
│       ├── {module-folder}/        # One folder per enabled module, containing .md files
│       └── assets/                 # Uploaded images (portraits, maps, etc.)
│
├── Campaign Hub.app/               # macOS app bundle (convenience launcher)
│   └── Contents/MacOS/launch       # Shell script that starts servers + Cloudflare Tunnel
│
├── scripts/
│   ├── start.sh                    # Start dev servers
│   └── stop.sh                     # Stop dev servers
│
└── dist/                           # Production build output
    ├── client/                     # Vite-built SPA
    └── server/                     # Compiled server JS
```

---

## How to Run It

### Prerequisites
- Node.js (v18+)
- npm
- cloudflared (optional, for remote player access — `brew install cloudflared`)

### Development Mode
```bash
npm install          # Install dependencies (first time only)
npm run dev          # Starts both servers concurrently
```
This launches:
- API server at `http://localhost:3001` (with hot reload via tsx)
- Frontend at `http://localhost:5173` (with Vite HMR)

### Production Build
```bash
npm run build        # Builds client (Vite) and server (tsc)
npm start            # Runs the compiled server, which serves the client too
```

### Using the macOS Launcher
Double-click `Campaign Hub.app`. It will:
1. Kill any existing processes on ports 3001 and 5173
2. Install dependencies if needed
3. Start a Cloudflare Tunnel (for remote player access)
4. Start the dev servers
5. Open the app in your default browser

### Remote Player Access
Players connect through a Cloudflare Tunnel. The `.app` launcher sets this up automatically. If running manually:
```bash
cloudflared tunnel --url http://localhost:5173   # Creates a public *.trycloudflare.com URL
```
Share the tunnel URL with players. They'll see the login page and use the player password to access.

### Environment Configuration
Copy or edit `.env` in the project root:
- `DM_PASSWORD` / `PLAYER_PASSWORD` — Set these to enable authentication. Without them, auth is disabled.
- `ANTHROPIC_API_KEY` — Required for AI-powered NPC generation (uses Claude API).
- `PORT` — API server port (default: 3001)
- `CAMPAIGNS_DIR` — Where campaign data is stored (default: `./campaigns`)

---

## Key Dependencies

### Runtime (Production)
| Package | What it does |
|---------|-------------|
| `express` | HTTP server framework — handles all API routing |
| `react` / `react-dom` / `react-router-dom` | Frontend UI framework and client-side routing |
| `@tanstack/react-query` | Server state management — caching, refetching, mutations for API calls |
| `gray-matter` | Parses markdown files with YAML frontmatter (the core data format) |
| `js-yaml` | YAML parsing/serialization for campaign config files |
| `zod` | Schema validation — validates frontmatter data on both client and server |
| `sharp` | Server-side image processing — resizing, thumbnails, format conversion |
| `multer` | Handles multipart file uploads (images) |
| `chokidar` | Watches the file system for changes to campaign files |
| `cors` | Cross-origin request handling (needed for Cloudflare Tunnel and local network access) |
| `helmet` | Security headers for the Express server |
| `express-rate-limit` | Rate limiting to prevent API abuse |
| `dotenv` | Loads environment variables from `.env` |
| `nanoid` | Generates short unique IDs for new files |
| `lucide-react` | Icon library used throughout the UI |
| `@anthropic-ai/sdk` | Claude API client for AI-powered NPC generation |

### Development Only
| Package | What it does |
|---------|-------------|
| `vite` / `@vitejs/plugin-react` | Frontend build tool and dev server with hot module replacement |
| `typescript` / `tsx` | TypeScript compiler and runtime (tsx provides watch mode for the server) |
| `tailwindcss` / `autoprefixer` / `postcss` | Utility-first CSS framework and its build toolchain |
| `tailwindcss-animate` | Animation utilities for Tailwind |
| `tailwind-merge` / `clsx` / `class-variance-authority` | CSS class merging and variant utilities |
| `concurrently` | Runs the client and server dev processes in parallel |
| `eslint` | Code linting |

---

## Known Limitations and Quirks

- **Polling-based sync** — Live play uses 1-second polling, not WebSockets. Updates are near-instant but each player generates ~60 requests/minute. The rate limiter is set to 5000 req/15min to handle 5 players + DM.
- **File-based storage** — Works great for single-DM use, but there's no database and no concurrent multi-user write safety beyond basic file locking. Don't have two DMs editing the same campaign simultaneously.
- **Tunnel URL changes** — Cloudflare's free quick tunnel gives a different `*.trycloudflare.com` URL each time you restart it. Players need the new URL each session. The `.app` launcher writes the current URL to `.tunnel-url` in the project root.
- **No offline/PWA support** — The app requires a running server. If the server stops, the UI stops working.
- **Image storage** — Uploaded images are stored in the campaign's `assets/` folder on disk. They're served by the Express server. If you move the campaign directory, image paths may break.
- **Authentication is optional** — If `DM_PASSWORD` and `PLAYER_PASSWORD` aren't set in `.env`, anyone on the network can access everything. This is fine for local-only use but important to know.
- **Google Drive sync** — The config exists in `.env` but the sync feature is not currently implemented.
