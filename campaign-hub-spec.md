# Campaign Hub - Technical Specification

## Executive Summary

Campaign Hub is a modular, local-first campaign management system for tabletop RPG game masters. It provides a dashboard interface for managing all aspects of a campaign (characters, locations, lore, sessions, etc.) while storing data in portable markdown files that sync to Google Drive for player access and backup.

### Core Principles

1. **Data Portability** - All campaign data lives in human-readable markdown files with YAML frontmatter
2. **Modular Architecture** - Features are self-contained modules that can be added/removed independently
3. **Multi-Campaign Support** - Switch between campaigns seamlessly; each campaign is fully isolated
4. **Player Accessibility** - Selective data sharing via Google Drive + static site generation for easy player access
5. **AI-Assisted** - Claude integration for content generation and lore consistency checking
6. **Game System Agnostic** - Flexible schemas that adapt to any TTRPG system
7. **Setting Agnostic** - The system makes no assumptions about genre, setting, or world structure; all campaign-specific details live in campaign data, never in application code

### Agnosticism Requirements

**CRITICAL: The application must be completely agnostic to campaign content.**

The following must NEVER be hardcoded in application code:
- Setting-specific terminology (e.g., "sector", "kingdom", "realm")
- Genre assumptions (sci-fi, fantasy, modern, etc.)
- Specific entity types beyond the abstract (character, location, faction, etc.)
- Game system mechanics or stats
- Location hierarchy assumptions (what contains what)
- Faction types or structures
- Any proper nouns from any campaign

**How agnosticism is achieved:**

1. **Location Types** - Defined per-campaign in `campaign.yaml`, not in code
   - A sci-fi campaign might define: system → station → district → bay
   - A fantasy campaign might define: kingdom → region → city → building
   - The app just knows "locations have a hierarchy" - the labels come from config

2. **Entity Subtypes** - All type-specific options come from campaign config
   - `faction_type` options defined in campaign, not hardcoded
   - `location_type` options defined in campaign, not hardcoded
   - UI dropdowns populate from config

3. **Custom Fields** - Stats, attributes, and campaign-specific data
   - Defined entirely in `campaign.yaml`
   - App renders them generically based on field type (number, text, select, etc.)

4. **AI Context** - Campaign-specific knowledge lives in `_meta/ai-context.md`
   - App passes this file's content to AI, doesn't interpret it
   - No hardcoded prompts referencing specific settings

5. **Display Labels** - UI text for campaign-specific concepts
   - Campaign config can override labels: `{ "location": "Site", "faction": "Organization" }`
   - Default labels are generic ("Location", "Faction", "Character")

**Test for agnosticism:** If you deleted all Haven references and created a Victorian mystery campaign or a superhero campaign, the app should work identically without code changes.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Campaign Hub Dashboard                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │  Characters │ │  Locations  │ │    Lore     │ │  Sessions │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │   Factions  │ │    Arcs     │ │    Maps     │ │  + More   │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Core Services                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Data Manager │ │  AI Service  │ │ Sync Service │             │
│  │  (CRUD ops)  │ │  (Claude)    │ │(Google Drive)│             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  Validator   │ │ Graph Engine │ │Static Builder│             │
│  │  (schemas)   │ │(relationships)│ │(player site) │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Campaign Data (Markdown)                     │
│  campaigns/                                                      │
│  ├── haven/                                                      │
│  │   ├── _meta/                                                  │
│  │   ├── characters/                                             │
│  │   ├── locations/                                              │
│  │   └── ...                                                     │
│  └── other-campaign/                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      Google Drive       │     │     GitHub Pages        │
│   (shared with players) │     │   (player-facing site)  │
└─────────────────────────┘     └─────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + TypeScript | Component-based, strong typing, large ecosystem |
| **UI Framework** | Tailwind CSS + shadcn/ui | Rapid styling, consistent components |
| **Build Tool** | Vite | Fast HMR, modern ESM support |
| **Backend** | Node.js + Express | JavaScript throughout, simple API layer |
| **Data Storage** | Markdown files (local filesystem) | Portable, human-readable, git-friendly |
| **Database** | SQLite (index/cache only) | Fast queries without duplicating data |
| **AI Integration** | Anthropic API (Claude) | Content generation, consistency checking |
| **Sync** | Google Drive API | Player sharing, cloud backup |
| **Static Site** | Astro | Fast static generation, markdown-native |
| **Deployment** | GitHub Pages | Free, reliable hosting for player site |

---

## Data Architecture

### Directory Structure

```
campaign-hub/
├── app/                          # Dashboard application
│   ├── src/
│   │   ├── core/                 # Shared services and utilities
│   │   │   ├── data/             # Data access layer
│   │   │   ├── ai/               # Claude integration
│   │   │   ├── sync/             # Google Drive sync
│   │   │   ├── validation/       # Schema validation
│   │   │   └── graph/            # Relationship graph engine
│   │   ├── modules/              # Feature modules
│   │   │   ├── characters/
│   │   │   ├── locations/
│   │   │   ├── lore/
│   │   │   ├── sessions/
│   │   │   ├── factions/
│   │   │   ├── arcs/
│   │   │   └── maps/
│   │   ├── components/           # Shared UI components
│   │   ├── layouts/              # Page layouts
│   │   └── App.tsx
│   ├── server/                   # Express backend
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── package.json
│
├── player-site/                  # Static site for players
│   ├── src/
│   ├── astro.config.mjs
│   └── package.json
│
├── campaigns/                    # Campaign data (synced to Google Drive)
│   ├── _global/                  # Cross-campaign resources
│   │   ├── schemas/              # Default schema definitions
│   │   └── templates/            # Reusable templates
│   ├── haven/                    # Example campaign
│   │   ├── _meta/
│   │   │   ├── campaign.yaml     # Campaign configuration
│   │   │   ├── schemas/          # Campaign-specific schema overrides
│   │   │   └── ai-context.md     # AI generation context for this campaign
│   │   ├── characters/
│   │   │   ├── player-characters/
│   │   │   └── npcs/
│   │   ├── locations/
│   │   ├── factions/
│   │   ├── lore/
│   │   ├── sessions/
│   │   ├── arcs/
│   │   └── assets/
│   │       ├── maps/
│   │       ├── portraits/
│   │       └── handouts/
│   └── [other-campaigns]/
│
├── .campaign-hub/                # Local app configuration
│   ├── config.yaml               # App settings
│   ├── cache.sqlite              # Index/search cache
│   └── sync-state.json           # Google Drive sync state
│
└── README.md
```

### Campaign Configuration

Each campaign has a `_meta/campaign.yaml` file:

```yaml
# campaigns/haven/_meta/campaign.yaml

id: haven
name: "Haven: The Shattered Expanse"
description: "A space opera campaign set in a universe where space itself is breathable"
game_system: custom           # Or: dnd5e, pathfinder2e, pbta, fate, etc.
created: 2024-01-15
last_modified: 2025-01-24

# DM information
dm:
  name: Rob
  email: optional@email.com

# Entity type configuration (defines what options appear in dropdowns)
entity_types:
  location_types:
    - id: system
      label: "Star System"
      can_contain: [world, station, anomaly]
    - id: world
      label: "World"
      can_contain: [region, city, landmark]
    - id: station
      label: "Station"
      can_contain: [district, bay, section]
    - id: region
      label: "Region"
      can_contain: [city, landmark, wilderness]
    - id: city
      label: "City"
      can_contain: [district, building, landmark]
    - id: district
      label: "District"
      can_contain: [building, landmark]
    - id: building
      label: "Building"
      can_contain: [room, floor]
    - id: room
      label: "Room"
      can_contain: []
  
  faction_types:
    - id: government
      label: "Government"
    - id: corporation
      label: "Corporation"
    - id: guild
      label: "Guild"
    - id: cult
      label: "Cult"
    - id: military
      label: "Military"
    - id: criminal
      label: "Criminal Organization"
    - id: other
      label: "Other"
  
  character_types:
    - id: pc
      label: "Player Character"
    - id: npc
      label: "NPC"
    - id: historical
      label: "Historical Figure"

# Optional: Override default UI labels for this campaign
labels:
  location: "Location"      # Could be "Site", "Place", "Area", etc.
  faction: "Faction"        # Could be "Organization", "Group", "House", etc.
  character: "Character"    # Could be "Individual", "Person", etc.

# Player access configuration
sharing:
  google_drive_folder_id: "abc123..."
  player_site_url: "https://username.github.io/haven-campaign"
  
  # What entity types are visible to players
  player_visible:
    - characters/player-characters    # Full access
    - characters/npcs:met             # Only NPCs tagged as "met"
    - locations:visited               # Only visited locations
    - lore/public                     # Public lore entries
    - factions:known                  # Known factions
    - sessions                        # Session recaps

# AI generation settings
ai:
  default_model: claude-sonnet-4-20250514
  generation_preview: true            # Show preview before saving (default)
  context_file: ai-context.md         # Campaign-specific AI context
  
  # Per-module overrides
  modules:
    characters:
      generation_preview: false       # Auto-save generated NPCs
      suggestions: true
    locations:
      generation_preview: true
      suggestions: true

# Custom fields for this campaign's game system
custom_fields:
  character:
    - name: grit
      type: number
      label: "Grit"
      description: "Physical resilience and toughness"
    - name: savvy
      type: number
      label: "Savvy"
      description: "Mental acuity and perception"
    - name: charm
      type: number
      label: "Charm"
      description: "Social grace and persuasiveness"
    - name: weird
      type: number
      label: "Weird"
      description: "Connection to the strange and supernatural"
    - name: species
      type: select
      label: "Species"
      options: [Human, Altered, Synthetic, Hybrid]
```

### Entity Schemas

#### Base Schema (all entities inherit)

```yaml
# campaigns/_global/schemas/_base.yaml

required:
  - id              # Unique identifier (auto-generated if not provided)
  - type            # Entity type (character, location, faction, etc.)
  - name            # Display name

optional:
  - tags            # Array of strings for filtering/categorization
  - description     # Brief summary
  - notes           # Freeform DM notes (never shown to players)
  - created         # ISO date, auto-set
  - modified        # ISO date, auto-updated
  - visibility      # public | players | dm-only (default: dm-only)
  - relationships   # Array of relationship objects

# Relationship structure
relationship:
  target: entity-id
  type: relationship-type
  description: optional context
  bidirectional: true | false
```

#### Character Schema

```yaml
# campaigns/_global/schemas/character.yaml

extends: _base
type: character

required:
  - character_type  # pc | npc | historical

optional:
  - player          # For PCs: who plays this character
  - status          # alive | dead | missing | unknown
  - faction         # Primary faction (entity reference)
  - location        # Current location (entity reference)
  - portrait        # Path to portrait image
  - pronouns        # Character's pronouns
  - appearance      # Physical description
  - personality     # Personality traits
  - background      # Character backstory
  - motivations     # Goals and drives
  - secrets         # DM-only information
  - stats           # Game system stats (flexible object)
  - inventory       # Items and equipment
  - abilities       # Special abilities, skills, etc.

relationship_types:
  - ally
  - enemy
  - family
  - romantic
  - professional
  - rival
  - mentor
  - student
  - employer
  - employee

# Player visibility rules
player_visibility:
  pc:
    always_visible:
      - name
      - appearance
      - stats
      - inventory
      - abilities
    player_controlled:       # The owning player can edit these
      - all
  npc:
    conditional: met         # Must have tag "met" to be visible
    always_visible:
      - name
      - appearance
    never_visible:
      - secrets
      - notes
```

#### Location Schema

```yaml
# campaigns/_global/schemas/location.yaml

extends: _base
type: location

required:
  - location_type   # Options defined in campaign.yaml entity_types.location_types

optional:
  - parent          # Parent location (entity reference)
  - children        # Child locations (auto-populated)
  - faction_control # Which faction controls this location
  - atmosphere      # Description of the feel/mood
  - features        # Notable features
  - secrets         # Hidden aspects (DM only)
  - maps            # Array of map objects

# Map object structure
map:
  file: path/to/image
  label: "Overview Map"
  hotspots:         # Clickable regions
    - region: [x1, y1, x2, y2]
      target: entity-id
      label: "Optional hover text"

# NOTE: Location type hierarchy (what can contain what) is defined 
# per-campaign in campaign.yaml, NOT hardcoded here. The app validates
# parent-child relationships against the campaign's entity_types config.

relationship_types:
  - trade_route
  - political_alliance
  - conflict
  - cultural_connection
  - travel_connection

player_visibility:
  conditional: visited
  always_visible:
    - name
    - location_type
    - parent
  never_visible:
    - secrets
    - notes
```

#### Faction Schema

```yaml
# campaigns/_global/schemas/faction.yaml

extends: _base
type: faction

required:
  - faction_type    # Options defined in campaign.yaml entity_types.faction_types

optional:
  - motto           # Faction motto or slogan
  - headquarters    # Location reference
  - leader          # Character reference
  - members         # Notable member characters
  - goals           # Public goals
  - secret_goals    # Hidden agenda (DM only)
  - resources       # What the faction controls
  - territory       # Locations under their influence
  - history         # Faction background

relationship_types:
  - ally
  - enemy
  - vassal
  - overlord
  - trade_partner
  - rival
  - neutral

player_visibility:
  conditional: known
  always_visible:
    - name
    - faction_type
    - motto
  never_visible:
    - secret_goals
    - notes
```

#### Session Schema

```yaml
# campaigns/_global/schemas/session.yaml

extends: _base
type: session

required:
  - session_number
  - date            # Real-world date played

optional:
  - title           # Episode title
  - summary         # What happened
  - highlights      # Key moments
  - characters_present  # Who was there
  - locations_visited   # Where they went
  - npcs_met        # NPCs encountered
  - loot            # Items acquired
  - clues           # Information learned
  - open_threads    # Unresolved plot points
  - next_session    # Setup for next time
  - in_game_date    # Date within the game world

player_visibility:
  always_visible:
    - session_number
    - date
    - title
    - summary
    - highlights
    - characters_present
    - locations_visited
    - npcs_met
    - loot
  never_visible:
    - notes
    - open_threads    # DM planning
```

#### Arc Schema

```yaml
# campaigns/_global/schemas/arc.yaml

extends: _base
type: arc

required:
  - arc_type        # main | side | personal | faction

optional:
  - status          # planned | active | completed | abandoned
  - sessions        # Sessions this arc spans
  - characters      # Characters involved
  - factions        # Factions involved
  - locations       # Key locations
  - hook            # How players encounter this
  - stakes          # What's at risk
  - resolution      # How it could end
  - actual_outcome  # How it actually ended
  - sub_arcs        # Child arcs

player_visibility:
  visibility: dm-only   # Arcs are DM planning tools
```

#### Lore Schema

```yaml
# campaigns/_global/schemas/lore.yaml

extends: _base
type: lore

required:
  - lore_type       # history | culture | technology | religion | geography | rules | other

optional:
  - era             # When this was relevant
  - related_factions
  - related_locations
  - related_characters
  - sources         # Where this info comes from in-world
  - contradictions  # Known inconsistencies (for mystery campaigns)

player_visibility:
  default: dm-only
  # Individual entries can be marked visibility: public
```

### Example Entity Files

#### Player Character

```markdown
---
id: captain-zara-chen
type: character
character_type: pc
name: "Captain Zara Chen"
player: "Alex"
status: alive
pronouns: she/her
visibility: public

tags:
  - pilot
  - veteran
  - haunted

faction: free-traders-guild
location: kepler-station

portrait: portraits/zara-chen.png

relationships:
  - target: jack-morrison
    type: rival
    description: "Former wingmate, bitter falling out"
  - target: free-traders-guild
    type: professional
    description: "Licensed captain in good standing"
  - target: haven-sector
    type: professional
    description: "Primary operating region"

stats:
  grit: 2
  savvy: 1
  charm: 0
  weird: 1

species: Human

abilities:
  - name: "Ace Pilot"
    description: "Advantage on all piloting checks"
  - name: "Danger Sense"
    description: "Can sense imminent threats"

inventory:
  - "Modified pulse pistol"
  - "Captain's badge (Free Traders Guild)"
  - "Lucky coin from Earth"
---

# Captain Zara Chen

## Appearance

Tall and lean with short-cropped black hair showing early grey at the temples. A thin scar runs from her left eyebrow to her cheek. Typically wears a worn leather flight jacket over practical shipboard clothing.

## Personality

Outwardly confident and quick with a sardonic quip, but those who know her well can see the weight she carries. Fiercely protective of her crew, sometimes to a fault. Has trouble trusting authority figures.

## Background

Former military pilot in the Terran Defense Force. Left under circumstances she doesn't discuss. Now runs cargo and occasional "special deliveries" through the Haven sector.

## Motivations

- Find out what really happened at the Battle of Cygnus Gate
- Keep her crew safe and her ship flying
- Stay one step ahead of her past
```

#### NPC

```markdown
---
id: maven-the-broker
type: character
character_type: npc
name: "Maven"
status: alive
pronouns: they/them
visibility: players

tags:
  - met
  - information-broker
  - mysterious
  - haven-station

faction: independent
location: haven-station-undercity

portrait: portraits/maven.png

relationships:
  - target: everyone
    type: professional
    description: "Sells information to all sides"
  - target: the-silence
    type: enemy
    description: "Knows too much about them"

appearance: "Shrouded figure who speaks through a voice modulator. Species unknown."
---

# Maven

## Appearance

Always appears in flowing dark robes with a featureless mask. Speaks through a voice modulator that gives their words an unsettling harmonic quality. Nobody knows their true species or appearance.

## Personality

Transactional but not unfair. Information is currency. Will deal with anyone, but has unspoken lines they won't cross.

## What They Know

Maven has eyes and ears everywhere. They specialize in:
- Ship movements and cargo manifests
- Corporate secrets
- Historical records others have tried to bury
- The locations of lost things

## Notes

<!-- DM ONLY - visibility: dm-only would hide this entire section -->

Maven is actually three people operating as one identity—a human, an AI, and something else entirely. They were created by the Archivists before that faction went silent.

They're terrified of the Silence and will do almost anything to avoid their attention.

## Secrets

Maven knows about the true nature of the Stewards but will never share this freely. This information is their ultimate insurance policy.
```

#### Location

```markdown
---
id: haven-station
type: location
location_type: station
name: "Haven Station"
visibility: public

tags:
  - visited
  - hub
  - neutral-territory

parent: haven-sector
faction_control: haven-station-council

maps:
  - file: maps/haven-station-overview.png
    label: "Station Overview"
    hotspots:
      - region: [120, 80, 280, 180]
        target: haven-docking-ring
        label: "Docking Ring"
      - region: [300, 150, 450, 300]
        target: haven-market-district
        label: "Market District"
      - region: [100, 300, 250, 450]
        target: haven-undercity
        label: "The Undercity"

relationships:
  - target: kepler-station
    type: trade_route
    description: "Regular freight runs"
  - target: terran-confederacy
    type: political_alliance
    description: "Nominal alliance, practically independent"
---

# Haven Station

## Overview

The largest independent station in the sector, Haven serves as a crossroads for traders, refugees, mercenaries, and those who don't want to be found. Built into a captured asteroid, it has grown organically over centuries into a labyrinthine city in space.

## Atmosphere

Crowded, noisy, alive. The air carries the smell of a dozen different cuisines, recycled atmosphere, and possibility. Neon signs advertise in a dozen languages. Here, anyone can become someone new.

## Districts

### The Docking Ring
Where ships arrive and depart. Heavily monitored by station security.

### Market District  
The commercial heart. Everything is for sale if you know where to look.

### The Undercity
Below the main levels. Less regulation, more danger, better secrets.

## Secrets

The station's core contains pre-human technology that nobody fully understands. It's why Haven exists where it does—the station was built around the artifact, not the other way around.
```

---

## Module Architecture

### Module Structure

Each module follows a consistent structure:

```
modules/characters/
├── manifest.json           # Module metadata and configuration
├── index.ts                # Module exports
├── components/
│   ├── CharacterDashboard.tsx    # Main module view
│   ├── CharacterList.tsx         # List/grid view
│   ├── CharacterSheet.tsx        # Detail view
│   ├── CharacterEditor.tsx       # Edit form
│   ├── CharacterGenerator.tsx    # AI generation UI
│   └── CharacterCard.tsx         # Compact card view
├── hooks/
│   ├── useCharacters.ts          # Data fetching/mutation
│   └── useCharacterGenerator.ts  # AI generation logic
├── services/
│   └── characterService.ts       # Business logic
├── types/
│   └── index.ts                  # TypeScript types
└── ai/
    ├── prompts/                  # Generation prompts
    │   ├── npc-generator.md
    │   └── background-generator.md
    └── validators/               # AI output validation
        └── characterValidator.ts
```

### Module Manifest

```json
{
  "id": "characters",
  "name": "Character Manager",
  "version": "1.0.0",
  "description": "Create, view, and edit player characters and NPCs",
  
  "dataTypes": ["character"],
  
  "permissions": {
    "read": true,
    "write": true,
    "delete": true,
    "generate": true
  },
  
  "components": {
    "dashboard": "CharacterDashboard",
    "list": "CharacterList",
    "detail": "CharacterSheet",
    "editor": "CharacterEditor",
    "generator": "CharacterGenerator",
    "card": "CharacterCard"
  },
  
  "routes": [
    { "path": "/characters", "component": "dashboard" },
    { "path": "/characters/:id", "component": "detail" },
    { "path": "/characters/:id/edit", "component": "editor" },
    { "path": "/characters/new", "component": "editor" },
    { "path": "/characters/generate", "component": "generator" }
  ],
  
  "navigation": {
    "label": "Characters",
    "icon": "Users",
    "order": 1
  },
  
  "ai": {
    "generation": {
      "enabled": true,
      "preview": "configurable",
      "prompts": ["npc-generator", "background-generator"]
    },
    "suggestions": {
      "enabled": true,
      "triggers": ["edit", "view"]
    },
    "consistency": {
      "enabled": true,
      "checks": ["faction-membership", "location-validity", "relationship-reciprocity"]
    }
  },
  
  "playerAccess": {
    "pc": {
      "view": true,
      "edit": "own",
      "create": false
    },
    "npc": {
      "view": "conditional",
      "viewCondition": "met",
      "edit": false,
      "create": false
    }
  },
  
  "dependencies": ["core", "factions", "locations"]
}
```

### Core Modules (MVP)

#### 1. Campaign Selector

**Purpose:** Switch between campaigns, create new ones, manage settings.

**Features:**
- Campaign list with thumbnails
- Create new campaign wizard
- Import campaign from folder
- Export campaign to archive
- Campaign settings editor
- Google Drive sync configuration

**Components:**
- `CampaignSelector` - Main selection interface
- `CampaignCard` - Campaign preview card
- `CampaignWizard` - New campaign creation
- `CampaignSettings` - Configuration editor

---

#### 2. Entity Browser

**Purpose:** Universal search and exploration across all entity types.

**Features:**
- Full-text search across all entities
- Filter by type, tags, relationships
- Relationship graph visualization
- Quick preview panel
- Recent entities
- Favorites/bookmarks

**Components:**
- `EntityBrowser` - Main search interface
- `SearchResults` - Results list with previews
- `FilterPanel` - Advanced filtering
- `RelationshipGraph` - D3-based visualization
- `QuickPreview` - Hover/click preview panel

---

#### 3. Character Manager

**Purpose:** Manage PCs and NPCs.

**Features:**
- Character list (grid/list toggle)
- Character sheet viewer
- Character editor with validation
- NPC generator (AI-powered)
- Background generator (AI-powered)
- Portrait gallery
- Relationship mapping

**Components:**
- `CharacterDashboard` - Overview with recent, favorites
- `CharacterList` - Filterable list/grid
- `CharacterSheet` - Full detail view
- `CharacterEditor` - Form-based editing
- `CharacterGenerator` - AI generation interface
- `PortraitGallery` - Visual character browser

**AI Features:**
- Generate NPC from brief description
- Suggest personality traits based on faction/background
- Check for relationship consistency
- Generate appearance descriptions

---

#### 4. Location Atlas

**Purpose:** Hierarchical location browser with maps.

**Features:**
- Hierarchical tree navigation
- Map viewer with clickable hotspots
- Location detail view
- Location editor
- Location generator (AI-powered)
- Travel connections visualization

**Components:**
- `LocationAtlas` - Main interface with tree + map
- `LocationTree` - Hierarchical navigation
- `MapViewer` - Interactive map display
- `MapEditor` - Hotspot definition tool
- `LocationDetail` - Full location view
- `LocationEditor` - Edit form
- `LocationGenerator` - AI generation

**AI Features:**
- Generate location descriptions
- Suggest points of interest
- Create atmosphere/mood text
- Check for hierarchy consistency

---

#### 5. Lore Codex

**Purpose:** World-building reference encyclopedia.

**Features:**
- Category-based organization
- Full-text search
- Linked entries (wiki-style)
- Timeline view for historical lore
- Import from markdown files
- Markdown editor with preview

**Components:**
- `LoreCodex` - Main interface
- `LoreCategories` - Category navigation
- `LoreEntry` - Entry viewer with linked terms
- `LoreEditor` - Markdown editor
- `LoreTimeline` - Chronological view
- `LoreGenerator` - AI generation

**AI Features:**
- Generate lore entries from prompts
- Expand brief notes into full entries
- Cross-reference existing lore
- Suggest related entries

---

#### 6. Session Tracker

**Purpose:** Session notes and campaign timeline.

**Features:**
- Session list with summaries
- Session detail view
- Session notes editor
- Timeline visualization
- "Previously on..." generator
- Link to entities mentioned

**Components:**
- `SessionTracker` - Main interface
- `SessionList` - Chronological session list
- `SessionDetail` - Full session view
- `SessionEditor` - Note-taking interface
- `SessionTimeline` - Visual timeline
- `PreviouslyOn` - Recap generator

**AI Features:**
- Generate session summary from notes
- Create "previously on" recap
- Extract entities mentioned
- Identify open plot threads

---

#### 7. Maps Module

**Purpose:** Map management and interactive viewing.

**Features:**
- Map upload and organization
- Hotspot editor
- Hierarchical map navigation
- Multiple map types (world, city, building, tactical)
- Map annotations
- Map search

**Components:**
- `MapsGallery` - All maps overview
- `MapViewer` - Interactive viewing
- `MapHotspotEditor` - Define clickable regions
- `MapAnnotator` - Add notes/markers
- `MapHierarchy` - Navigate through zoom levels

---

### Extended Modules (Post-MVP)

#### 8. Faction Web

- Faction management
- Relationship visualization
- Influence tracking
- Faction goals and agendas

#### 9. Arc Planner

- Story arc management
- Plot thread tracking
- Quest trees
- Foreshadowing notes

#### 10. Encounter Builder

- Combat/social encounter prep
- Pull relevant NPCs
- Challenge balancing
- Random encounter tables

#### 11. Session Prep

- Pre-session checklist
- Relevant NPC refresher
- Unresolved threads
- Location summaries

#### 12. Handout Creator

- Generate player handouts
- Select visible information
- Export to PDF/image
- Share links

#### 13. Random Tables

- Context-aware generators
- Names, rumors, encounters
- Custom table creation
- Weighted results

#### 14. Consistency Checker

- Lore validation
- Relationship reciprocity
- Timeline coherence
- Orphaned references

---

## Core Services

### Data Manager

Handles all CRUD operations on campaign data.

```typescript
interface DataManager {
  // Campaign operations
  getCampaigns(): Campaign[];
  loadCampaign(id: string): Campaign;
  createCampaign(data: CampaignCreate): Campaign;
  
  // Entity operations
  getEntities(type: EntityType, filters?: Filters): Entity[];
  getEntity(id: string): Entity | null;
  createEntity(data: EntityCreate): Entity;
  updateEntity(id: string, data: EntityUpdate): Entity;
  deleteEntity(id: string): void;
  
  // Search
  search(query: string, options?: SearchOptions): SearchResult[];
  
  // Relationships
  getRelationships(entityId: string): Relationship[];
  addRelationship(from: string, to: string, type: string): void;
  
  // File operations
  readMarkdownFile(path: string): ParsedMarkdown;
  writeMarkdownFile(path: string, data: ParsedMarkdown): void;
}
```

### Validation Service

Validates entities against schemas.

```typescript
interface ValidationService {
  validateEntity(entity: Entity, schema: Schema): ValidationResult;
  validateCampaign(campaign: Campaign): ValidationResult[];
  getSchema(type: EntityType, campaign?: Campaign): Schema;
  
  // Consistency checks
  checkRelationshipReciprocity(campaign: Campaign): Issue[];
  checkOrphanedReferences(campaign: Campaign): Issue[];
  checkTimelineConsistency(campaign: Campaign): Issue[];
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### AI Service

Handles all Claude interactions.

```typescript
interface AIService {
  // Generation
  generate(prompt: GenerationPrompt, context: CampaignContext): Promise<GeneratedContent>;
  
  // Suggestions
  getSuggestions(entity: Entity, context: CampaignContext): Promise<Suggestion[]>;
  
  // Consistency
  checkConsistency(entity: Entity, context: CampaignContext): Promise<ConsistencyResult>;
  
  // Context building
  buildContext(campaign: Campaign, focus?: Entity): CampaignContext;
}

interface GenerationPrompt {
  type: 'npc' | 'location' | 'lore' | 'session-recap' | 'description';
  input: string;
  constraints?: Record<string, any>;
}

interface CampaignContext {
  campaignSummary: string;
  relevantFactions: Faction[];
  relevantLocations: Location[];
  relevantCharacters: Character[];
  recentSessions: Session[];
  customFields: Record<string, any>;
}
```

### Sync Service

Manages Google Drive synchronization.

```typescript
interface SyncService {
  // Connection
  connect(credentials: GoogleCredentials): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Sync operations
  syncCampaign(campaign: Campaign): Promise<SyncResult>;
  getLastSyncTime(campaign: Campaign): Date | null;
  
  // Conflict resolution
  getConflicts(): Conflict[];
  resolveConflict(conflict: Conflict, resolution: 'local' | 'remote' | 'merge'): void;
  
  // Player access
  updatePlayerPermissions(campaign: Campaign): Promise<void>;
}
```

### Graph Engine

Manages entity relationships for visualization and querying.

```typescript
interface GraphEngine {
  // Build graph from campaign data
  buildGraph(campaign: Campaign): EntityGraph;
  
  // Queries
  getConnectedEntities(entityId: string, depth?: number): Entity[];
  findPath(from: string, to: string): Entity[];
  getEntityClusters(): EntityCluster[];
  
  // Visualization data
  getVisualizationData(options: VisOptions): GraphData;
}
```

### Static Site Builder

Generates player-facing static site.

```typescript
interface StaticSiteBuilder {
  // Build operations
  build(campaign: Campaign): Promise<BuildResult>;
  preview(): Promise<PreviewServer>;
  
  // One-click rebuild from dashboard
  rebuildAndDeploy(campaign: Campaign): Promise<DeployResult>;
  
  // Deployment
  deployToGitHubPages(campaign: Campaign): Promise<DeployResult>;
  
  // Configuration
  getPlayerVisibleEntities(campaign: Campaign): Entity[];
  
  // Status
  getLastBuildTime(campaign: Campaign): Date | null;
  getBuildStatus(): 'idle' | 'building' | 'deploying' | 'error';
}
```

**Dashboard Integration:**
The dashboard includes a "Publish to Players" button that:
1. Shows current build status and last publish time
2. One click triggers `rebuildAndDeploy()`
3. Shows progress indicator during build
4. Confirms successful deployment with link to player site
5. Shows error details if build fails

---

## AI Integration Details

### Context Building Strategy

When generating content or checking consistency, we need to provide Claude with relevant campaign context. The strategy:

1. **Campaign Summary** - Always included. From `_meta/ai-context.md`.

2. **Relevant Entities** - Based on the current operation:
   - Generating NPC → Include faction info, location info, related characters
   - Generating location → Include parent location, nearby locations, controlling faction
   - Checking consistency → Include all directly related entities

3. **Schema Information** - Include relevant schemas so Claude understands valid fields.

4. **Recent Context** - Last 2-3 sessions for ongoing relevance.

### Example: NPC Generation

```typescript
async function generateNPC(input: NPCGenerationInput): Promise<Character> {
  const context = buildContext({
    focus: 'character',
    includeSchemas: ['character'],
    includeEntities: {
      factions: input.faction ? [input.faction] : 'relevant',
      locations: input.location ? [input.location] : 'relevant',
      characters: 'sample'  // A few example NPCs for style consistency
    }
  });
  
  const prompt = `
Generate an NPC for this campaign based on the following input:

${input.description}

## Campaign Context
${context.campaignSummary}

## Relevant Faction
${context.factionInfo || 'None specified'}

## Location Context  
${context.locationInfo || 'None specified'}

## Example NPCs (for style reference)
${context.exampleCharacters}

## Character Schema
${context.characterSchema}

Generate a complete character in the following YAML format...
`;

  const response = await claude.generate(prompt);
  return parseAndValidate(response);
}
```

### Consistency Checking

```typescript
async function checkConsistency(entity: Entity): Promise<ConsistencyIssue[]> {
  const context = buildContext({
    focus: entity.type,
    includeEntities: {
      related: getRelatedEntities(entity.id)
    }
  });
  
  const prompt = `
Review this ${entity.type} for consistency with established campaign facts:

## Entity to Review
${entityToYaml(entity)}

## Related Entities
${context.relatedEntities}

## Campaign Facts
${context.establishedFacts}

Check for:
1. Contradictions with established facts
2. Invalid references to non-existent entities
3. Timeline inconsistencies
4. Relationship conflicts

Return a list of issues found, or confirm if consistent.
`;

  return parseConsistencyResponse(await claude.generate(prompt));
}
```

---

## Player Site Architecture

The player site is a static site generated from campaign data, showing only player-visible content.

### Technology

- **Astro** - Static site generator with markdown support
- **Tailwind CSS** - Styling
- **Deployed to** - GitHub Pages

### Structure

```
player-site/
├── src/
│   ├── pages/
│   │   ├── index.astro           # Campaign landing page
│   │   ├── characters/
│   │   │   ├── index.astro       # Character list
│   │   │   └── [id].astro        # Character detail
│   │   ├── locations/
│   │   ├── factions/
│   │   ├── lore/
│   │   └── sessions/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/
│   │   ├── CharacterCard.astro
│   │   ├── LocationCard.astro
│   │   └── ...
│   └── styles/
│       └── global.css
├── public/
│   └── assets/                   # Copied from campaign assets
└── astro.config.mjs
```

### Build Process

1. Read campaign configuration for player visibility rules
2. Filter entities to player-visible only
3. Copy allowed assets (portraits, maps)
4. Generate static pages
5. Deploy to GitHub Pages

### Player Features

- Character roster (PCs + met NPCs)
- Location atlas (visited locations only)
- Faction overview (known factions only)
- Lore codex (public entries only)
- Session recaps
- Interactive maps (visited areas only)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic infrastructure and one working module.

1. Project scaffolding
   - Vite + React + TypeScript setup
   - Express backend setup
   - Tailwind + shadcn/ui configuration
   
2. Core services (basic versions)
   - File system data manager
   - Markdown parser/writer
   - Basic validation
   
3. Campaign management
   - Campaign selector
   - Campaign configuration loading
   - Multi-campaign support
   
4. Character module (MVP)
   - Character list view
   - Character detail view
   - Character editor
   - Basic NPC generator

**Deliverable:** Working dashboard that can browse and edit characters for a campaign.

---

### Phase 2: Core Modules (Week 3-4)

**Goal:** Complete core module set.

1. Location Atlas
   - Hierarchical browser
   - Map viewer with hotspots
   - Location editor
   
2. Lore Codex
   - Category navigation
   - Markdown viewer/editor
   - Linked entries
   
3. Session Tracker
   - Session list/timeline
   - Session editor
   - Entity linking

4. Entity Browser
   - Global search
   - Filtering
   - Quick preview

**Deliverable:** Full core functionality for campaign management.

---

### Phase 3: AI Integration (Week 5)

**Goal:** Claude-powered features.

1. AI service implementation
   - Context builder
   - Generation API
   - Response parsing
   
2. Generation features
   - NPC generator enhancement
   - Location generator
   - Session recap generator
   
3. Consistency checking
   - Relationship validation
   - Lore consistency
   - Reference checking

**Deliverable:** AI-assisted content generation and validation.

---

### Phase 4: Sync & Sharing (Week 6)

**Goal:** Google Drive sync and player site.

1. Google Drive integration
   - OAuth setup
   - Sync service
   - Conflict handling
   
2. Player site generator
   - Astro setup
   - Visibility filtering
   - Static generation
   
3. GitHub Pages deployment
   - Automated builds
   - Deploy workflow

**Deliverable:** Campaign data synced to Drive, player site live.

---

### Phase 5: Maps & Polish (Week 7)

**Goal:** Interactive maps and UX refinement.

1. Map module
   - Map upload/management
   - Hotspot editor
   - Hierarchical navigation
   
2. Relationship graph
   - D3 visualization
   - Interactive exploration
   
3. UI/UX polish
   - Loading states
   - Error handling
   - Responsive design
   - Keyboard shortcuts

**Deliverable:** Polished, complete MVP.

---

### Phase 6: Extended Features (Week 8+)

**Goal:** Post-MVP enhancements.

- Faction Web module
- Arc Planner module
- Session Prep wizard
- Handout Creator
- Random Tables
- Import/Export tools

---

## Example Campaign: Haven (Sample Data Only)

**IMPORTANT:** Haven is used purely as sample data for testing and demonstration. No Haven-specific concepts, terminology, or structure should influence the application code. The app must work identically for a fantasy kingdom campaign, a modern spy thriller, or any other setting.

For development and testing, we'll create sample Haven data as we build each module. This data demonstrates how the generic system handles a specific campaign, but the data is created *after* the module is built, not designed alongside it.

### When to Create Sample Data

- **Phase 1 (Characters module):** Create 2-3 sample characters to test the module
- **Phase 2 (Locations module):** Create 2-3 sample locations with hierarchy
- **Phase 2 (Lore module):** Create 2-3 sample lore entries
- etc.

Sample data is created to verify the module works, not to drive its design.

### Haven Campaign Summary (for AI context file)

This would live in `campaigns/haven/_meta/ai-context.md`:

```markdown
# Haven Campaign Context

Haven is a space opera campaign set in a universe where space itself is breathable—ships sail between worlds like ocean vessels, and ancient alien artifacts dot the void. The players crew a free trader vessel navigating between corporate powers, pirate fleets, and the mysterious remnants of a precursor civilization.

## Key Concepts

- Space is breathable; ships function like sailing vessels
- Ancient precursor civilization left artifacts and mysteries
- Bio-mechanical entities called Stewards guard unknown secrets
- Mix of human and non-human species

## Tone

Firefly meets Mass Effect—found family, moral ambiguity, ancient mysteries, corporate villainy.

## Custom Stats

Characters use four stats: Grit (physical), Savvy (mental), Charm (social), Weird (supernatural connection).
```

This context file is passed to AI during generation but has zero influence on application code.

---

## Appendix: File Format Examples

The following examples demonstrate the markdown file format. While they use Haven content for illustration, they show the *generic structure* that works for any campaign. The actual field values, terminology, and content are campaign-specific and defined in each campaign's configuration.

### Complete Character File

```markdown
---
id: jack-morrison
type: character
character_type: npc
name: "Jack Morrison"
status: alive
pronouns: he/him
visibility: players

tags:
  - met
  - rival
  - pilot
  - terran-military

faction: terran-confederacy
location: kepler-station

portrait: portraits/jack-morrison.png

relationships:
  - target: captain-zara-chen
    type: rival
    description: "Former wingmate, unresolved tension"
    bidirectional: true
  - target: terran-confederacy
    type: professional
    description: "Lieutenant Commander, TDF"
  - target: kepler-station
    type: stationed
    description: "Current assignment"

stats:
  grit: 2
  savvy: 2
  charm: 1
  weird: 0

species: Human

abilities:
  - name: "Military Training"
    description: "Formal combat and tactics training"
  - name: "By the Book"
    description: "Advantage when following proper procedures"

appearance: "Athletic build, regulation haircut, always in uniform. Handsome in a conventional way, with a smile that doesn't reach his eyes."

personality: "Professional, ambitious, harbors resentment. Believes in the system but is starting to see its cracks."

created: 2024-06-15
modified: 2025-01-24
---

# Jack Morrison

## Background

Jack and Zara trained together, flew together, and were the best pilot team in their squadron. Then came Cygnus Gate. Jack followed orders. Zara didn't. She saved lives. He got promoted.

He's never forgiven her for making him look like a coward, or himself for not following her lead.

## Role in Story

Jack represents the path not taken—what Zara might have become if she'd stayed. He's not a villain, but his by-the-book mentality puts him at odds with the crew's more flexible morality.

## Secrets

Jack knows more about what really happened at Cygnus Gate than he lets on. He's seen the classified reports. The official story is a lie, and he's complicit in it.

He's also been ordered to keep tabs on Zara. Someone high up wants to know what she's doing.

## Notes

Good for: creating tension, military complications, possible redemption arc

Voice: Formal, clipped, occasional moments of genuine humanity breaking through
```

### Complete Location File

```markdown
---
id: haven-station-undercity
type: location
location_type: district
name: "The Undercity"
visibility: players

tags:
  - visited
  - dangerous
  - criminal
  - information

parent: haven-station
faction_control: none

maps:
  - file: maps/undercity-overview.png
    label: "Undercity Overview"
    hotspots:
      - region: [50, 100, 150, 200]
        target: mavens-parlor
        label: "Maven's Parlor"
      - region: [200, 150, 300, 250]
        target: the-pit
        label: "The Pit (fighting arena)"
      - region: [100, 300, 200, 400]
        target: black-market
        label: "The Exchange"

relationships:
  - target: haven-station
    type: part_of
  - target: free-traders-guild
    type: neutral
    description: "Tolerated but not welcome"
  - target: the-silence
    type: presence
    description: "Rumors of agents operating here"

atmosphere: "Dark, humid, the smell of recycled air and desperation. Neon cuts through perpetual twilight. Down here, the station's veneer of civilization falls away."

created: 2024-03-10
modified: 2025-01-20
---

# The Undercity

## Overview

Below Haven Station's gleaming commercial levels lies a different world. The Undercity grew in the maintenance tunnels, abandoned cargo bays, and forgotten sections of the station's ever-expanding structure. Here, those who can't afford topside living—or don't want to be found—make their homes.

## Features

### The Twilight Zone
The transitional area between legitimate station and Undercity. Security patrols thin out. Lighting becomes unreliable. The rules start to bend.

### Maven's Parlor
The information broker's domain. Neutral ground where deals are made and secrets change hands.

### The Pit
Underground fighting arena. Blood sport for those who bet on it, last resort income for those who fight in it.

### The Exchange
The Undercity's black market. If it exists and someone wants to sell it, it can be found here. Quality varies. Buyer beware.

## Secrets

The Undercity's deepest levels approach the station's mysterious core—the precursor artifact around which Haven was built. Strange things happen near the core. People report whispers, lost time, impossible geometries.

The station council knows but keeps it quiet. The Undercity's residents know too, and stay away from the deep places.

## Notes

Good for: shady dealings, finding illegal goods, information gathering, chase scenes, atmospheric tension

Danger level: Moderate (stay in public areas) to High (deep sections)
```

---

## Summary

Campaign Hub is designed to be:

1. **Portable** - All data in markdown, works offline, easy to backup
2. **Modular** - Add features without touching core code
3. **Collaborative** - Players access what they should see
4. **AI-Enhanced** - Claude helps with generation and consistency
5. **Game-Agnostic** - Works with any TTRPG system
6. **Setting-Agnostic** - Works with any genre or world structure

### Critical Implementation Reminders

**Before writing any code, ask:** "Would this work for a fantasy campaign? A modern spy thriller? A superhero game?" If the answer is no, the design is wrong.

**Hardcoding red flags:**
- Dropdown options that aren't from campaign config
- Hierarchy assumptions (what contains what)
- Genre-specific terminology in UI or code
- Proper nouns anywhere in application code
- AI prompts that reference specific settings

**The test:** Delete all Haven sample data. Create a new campaign called "Victorian Mysteries" with locations like `city → borough → street → building` and factions like `Scotland Yard, Criminal Underworld, Aristocracy`. The app should work perfectly without any code changes.

The phased implementation approach delivers value early while building toward a comprehensive tool. Sample data is created *after* each module is built to verify it works, not designed alongside it.
