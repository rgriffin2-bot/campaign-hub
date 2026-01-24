# Campaign Hub

A modular, local-first campaign management system for tabletop RPG game masters.

## Features

- **Local-First**: All campaign data stored in portable markdown files with YAML frontmatter
- **Setting Agnostic**: No hardcoded campaign settings - works with any genre or game system
- **Modular Architecture**: Self-contained feature modules that can be added independently
- **Multi-Campaign Support**: Switch between campaigns seamlessly
- **AI-Assisted**: Claude integration for content generation (coming in Phase 3)
- **Player Sharing**: Google Drive sync and static site generation (coming in Phase 4)

## Current Status: Phase 1 Foundation ✅

Phase 1 is complete with the following features:

### ✨ Working Features

- **Campaign Management**: Load and switch between campaigns
- **Character Module**:
  - Browse all characters with search and filtering
  - View detailed character sheets
  - Create and edit characters with dynamic forms
  - Campaign-specific custom fields
- **Data Portability**: All data stored in markdown files
- **Type Safety**: Full TypeScript implementation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + tsx
- **Routing**: React Router v6
- **Data Storage**: Markdown files with YAML frontmatter
- **Parsing**: gray-matter + yaml

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd CampaignHub
   ```

2. Install dependencies:
   ```bash
   cd app
   npm install
   ```

3. Start the development servers:
   ```bash
   npm run dev:full
   ```

   This runs both the backend (port 3001) and frontend (port 5173) concurrently.

4. Open your browser:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api

## Project Structure

```
CampaignHub/
├── app/                          # Dashboard application
│   ├── src/
│   │   ├── core/                # Core services (data, types, context)
│   │   ├── modules/             # Feature modules
│   │   │   └── characters/      # Character management module
│   │   ├── components/          # Shared UI components
│   │   └── App.tsx
│   ├── server/                  # Express backend
│   │   ├── routes/             # API routes
│   │   └── index.ts
│   └── package.json
├── campaigns/                   # Campaign data (markdown files)
│   ├── _global/                # Cross-campaign resources
│   │   └── schemas/           # Default schema definitions
│   └── haven/                 # Example campaign
│       ├── _meta/             # Campaign configuration
│       │   └── campaign.yaml
│       └── characters/        # Character markdown files
└── campaign-hub-spec.md       # Full specification
```

## Usage

### Viewing Characters

1. The campaign selector automatically loads available campaigns
2. Navigate to "Characters" in the sidebar
3. Browse the character list
4. Click any character to view their full sheet

### Creating Characters

1. Click "New Character" button
2. Fill in the form (custom fields appear based on campaign config)
3. Save - the character is written to a markdown file

### Editing Characters

1. View a character sheet
2. Click "Edit"
3. Make changes
4. Save - changes persist to the markdown file

## Sample Data

The project includes a sample "Haven" campaign (space opera setting) with:
- 3 characters (1 PC, 2 NPCs)
- Custom stat system (Grit, Savvy, Charm, Weird)
- Campaign configuration demonstrating the agnostic architecture

## Roadmap

### Phase 2: Core Modules (Planned)
- Location Atlas with hierarchical navigation
- Lore Codex with wiki-style linking
- Session Tracker with timeline
- Entity Browser (global search)

### Phase 3: AI Integration (Planned)
- NPC generator
- Location generator
- Session recap generator
- Consistency checking

### Phase 4: Sync & Sharing (Planned)
- Google Drive synchronization
- Static player site generation
- GitHub Pages deployment

### Phase 5: Maps & Polish (Planned)
- Interactive maps with hotspots
- Relationship graph visualization
- UI/UX refinements

## Architecture Principles

### Setting Agnosticism

The application is **completely agnostic** to campaign content:

- ✅ No hardcoded entity types (comes from campaign.yaml)
- ✅ No hardcoded custom fields (comes from campaign.yaml)
- ✅ No setting-specific terminology in code
- ✅ Dynamic form generation based on campaign config
- ✅ UI labels configurable per-campaign

**Test**: You could delete all Haven data and create a Victorian mystery campaign or superhero campaign without changing any application code.

### Data Portability

All campaign data lives in human-readable markdown files:

```markdown
---
id: character-id
type: character
name: "Character Name"
stats:
  grit: 2
  savvy: 1
---

# Character Name

Character details in markdown...
```

## API Endpoints

- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign config
- `GET /api/campaigns/:id/:entityType` - List entities
- `GET /api/campaigns/:id/:entityType/:entityId` - Get entity
- `POST /api/campaigns/:id/:entityType` - Create entity
- `PUT /api/campaigns/:id/:entityType/:entityId` - Update entity
- `DELETE /api/campaigns/:id/:entityType/:entityId` - Delete entity

## Contributing

This is a personal project but built with best practices and clean architecture. See `campaign-hub-spec.md` for the full technical specification.

## License

MIT

## Acknowledgments

- Built with Claude (Anthropic)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
