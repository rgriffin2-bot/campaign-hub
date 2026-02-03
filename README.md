# Campaign Hub

A modular campaign management dashboard for tabletop RPG game masters. Built with React, TypeScript, and Express.

## Features

### Core Features
- **Markdown-based content** - All entries stored as human-readable markdown files with YAML frontmatter
- **Real-time live play dashboard** - Track party status, NPCs, ships, and dice rolls during sessions
- **Player view mode** - Separate read-only interface for players with filtered content
- **Remote access** - Built-in ngrok support for sharing with remote players
- **Password protection** - Separate DM and player passwords for access control

### Modules

| Module | Description |
|--------|-------------|
| **Lore** | World-building notes, history, factions, and setting details |
| **NPCs** | Character profiles with portraits, stats, and AI-powered generation |
| **Locations** | Places and celestial bodies with interactive star system map |
| **Rules** | House rules, reference cards, and quick-lookup content |
| **Player Characters** | Party member tracking with stress, harm, and custom trackers |
| **Ships & Vehicles** | Vessel stats with pressure gauges and damage tracking |
| **Factions** | Organizations with affinity tracking (-3 to +3 scale) |
| **Session Notes** | Session summaries and campaign journal |
| **Downtime Projects** | Progress clocks for long-term goals (Forged in the Dark style) |
| **Live Play** | Real-time dashboard combining all active game elements |

### Live Play Dashboard
- Dice roller with history and player visibility toggle
- Party tracker with editable stress, harm, and custom stats
- Scene NPCs with disposition indicators and stat blocks
- Crew ships/vehicles with pressure and damage tracking
- Scene ships with disposition-based sorting

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/campaign-hub.git
cd campaign-hub

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (client) with the API at `http://localhost:3001`.

### Production Build

```bash
npm run build
npm start
```

## Configuration

Edit `.env` to configure your instance:

```env
# Server
PORT=3001
NODE_ENV=development

# Data directories
CAMPAIGNS_DIR=./campaigns

# Authentication (recommended for network access)
DM_PASSWORD=your-dm-password
PLAYER_PASSWORD=your-player-password

# AI Features (optional - for NPC generation)
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Project Structure

```
campaign-hub/
├── app/
│   ├── client/           # React frontend
│   │   ├── core/         # Layout, providers, routing
│   │   ├── modules/      # Module-specific views
│   │   ├── player/       # Player view components
│   │   └── components/   # Shared UI components
│   ├── server/           # Express backend
│   │   ├── core/         # File store, auth, campaign manager
│   │   └── modules/      # Module-specific routes
│   └── shared/           # Shared types and schemas
├── campaigns/            # Campaign data (markdown files)
├── templates/            # Entry templates for each module
└── dist/                 # Production build output
```

## Usage

### Creating Content

1. Navigate to any module (Lore, NPCs, Locations, etc.)
2. Click "New [Entry Type]" button
3. Fill in the form and save
4. Content is stored as markdown in `campaigns/[campaign-id]/[module]/`

### Using Templates

The `templates/` directory contains markdown templates for each module type. These show the available frontmatter fields and suggested content structure.

### Player Access

1. Set `PLAYER_PASSWORD` in `.env`
2. Share the URL with players
3. Players log in with the player password
4. They see a filtered, read-only view (hidden entries excluded)

### Remote Access (ngrok)

For remote players:

1. Install ngrok: `brew install ngrok` (macOS) or download from ngrok.com
2. Run ngrok: `ngrok http 3001`
3. Share the generated URL with players
4. The app detects ngrok URLs and displays them in the dashboard

### Live Play Session

1. Navigate to the Live Play module
2. Add PCs to track from Player Characters module
3. Add NPCs to the scene using the "Add to Scene" button
4. Add ships/vehicles to the scene similarly
5. Use the dice roller for shared rolls
6. Players can view and edit their own character's trackers

### Sidebar Customization

As a DM, you can drag and drop modules in the sidebar to reorder them. The order is saved per-campaign.

## Module Details

### Downtime Projects (Progress Clocks)

Track long-term goals with segmented progress clocks:
- **4 segments** - Simple/straightforward tasks
- **6 segments** - Standard complexity (default)
- **8 segments** - Complex/major undertakings

Progress can be adjusted by clicking clock segments or using +/- buttons.

### Factions

Track relationships with organizations using an affinity scale:
- **+3** Allies
- **+2** Friendly
- **+1** Favorable
- **0** Neutral
- **-1** Unfavorable
- **-2** Hostile
- **-3** Open Hostilities

### NPC Generation (AI-Powered)

With an Anthropic API key configured, you can generate NPCs automatically:
1. Navigate to NPCs → Generate
2. Provide a prompt describing the character
3. AI generates name, description, personality, and stat suggestions

## API Reference

### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Check current session

### Campaigns
- `GET /api/campaigns` - List campaigns (DM only)
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/activate` - Set active campaign

### Files (per module)
- `GET /api/campaigns/:id/files/:module` - List entries
- `GET /api/campaigns/:id/files/:module/:fileId` - Get entry
- `POST /api/campaigns/:id/files/:module` - Create entry
- `PUT /api/campaigns/:id/files/:module/:fileId` - Update entry
- `DELETE /api/campaigns/:id/files/:module/:fileId` - Delete entry

### Player API
All player endpoints mirror the DM endpoints but filter hidden content:
- `GET /api/player/campaigns/:id/files/:module`
- `GET /api/player/campaigns/:id/files/:module/:fileId`

## Development

### Scripts

```bash
npm run dev          # Start dev server (client + API)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Adding a New Module

1. Create schema in `app/shared/schemas/`
2. Create server module in `app/server/modules/`
3. Create client views in `app/client/modules/`
4. Register in `app/server/index.ts` and `app/client/core/ModuleRouter.tsx`
5. Add template in `templates/`

## Tech Stack

- **Frontend**: React 18, React Router, TanStack Query, Tailwind CSS
- **Backend**: Express, TypeScript
- **Storage**: File-based (markdown with YAML frontmatter)
- **Validation**: Zod schemas
- **AI**: Anthropic Claude API (optional)

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.
