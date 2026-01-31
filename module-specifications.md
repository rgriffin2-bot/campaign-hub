# Module Specifications: Rules, Player Characters, and Live Play

## Module Overview

These three modules are interconnected:

- **Rules Module**: Reference database for all game mechanics and moves
- **Player Characters Module**: Character creation, editing, and sheet management
- **Live Play Module**: Session-time tracking for the party and ship

They share data in the following ways:

- Player Characters reference Rules (playbook moves are pulled from Rules)
- Live Play displays a simplified, editable view of Player Character data
- Live Play can sync changes back to Player Character files

---

## Module 1: Rules

### Purpose

Searchable, browsable reference for all game rules, moves, and mechanics. Card-based interface similar to other modules.

### Data Structure

Each rule/move is a markdown file in `{campaign}/rules/`

Frontmatter fields:

```yaml
id: string                    # Unique identifier
name: string                  # Display name
category: string              # Primary category (see below)
subcategory: string?          # Optional subcategory
tags: string[]                # Searchable tags
playerVisible: boolean        # Whether players can see this
source: string?               # e.g., "Core Rules", "Expansion", "Homebrew"
```

**Categories** (defined in campaign settings, but examples):

- `core-mechanic` - Basic dice rolling, position/effect, etc.
- `action` - The 12 actions (Scramble, Skulk, Smash, etc.)
- `general-move` - Moves anyone can use (Aid, Setup, Flashback, etc.)
- `playbook-move` - Class-specific moves (selectable by PCs)
- `downtime` - Downtime activities
- `harm-recovery` - Harm, healing, death mechanics
- `gear` - Equipment rules and item tags
- `ship` - Ship mechanics, damage, etc.
- `gm-reference` - GM-only rules and guidance

Markdown body contains the full rule text, formatted with headers, lists, tables as needed.

### UI Views

**List View:**

- Card grid showing all rules
- Filter by category (dropdown or sidebar filter)
- Filter by tags
- Search across name and content
- Toggle "Player Visible Only" for player-facing view
- Sort by name, category

**Detail View:**

- Full rule text rendered as markdown
- Category/tags displayed
- Related rules (same category or shared tags)
- "Copy link" for sharing specific rules

No editor in this module - rules are edited as markdown files directly or through the generic file editor. This keeps the Rules module read-optimized.

### API Endpoints

Uses standard CRUD from dashboard shell, plus:

- `GET /api/modules/rules/categories` - List all categories in use
- `GET /api/modules/rules/search?q=` - Full-text search
- `GET /api/modules/rules/by-category/:category` - Filter by category

### Player Site

Rules with `playerVisible: true` are exported to the player site, organized by category.

---

## Module 2: Player Characters

### Purpose

Create, view, and edit player characters. Full character sheet with all mechanical and narrative elements.

### Data Structure

Each PC is a markdown file in `{campaign}/player-characters/`

Frontmatter fields:

```yaml
id: string
name: string
player: string                # Real-world player name
playerVisible: true           # Always true for PCs

# Demographics & Biography
portrait: string?             # Filename in assets/portraits/
pronouns: string?
species: string?
age: string?
appearance: string?           # Brief physical description
background: string?           # One-line background summary

# Class/Occupation
playbook: string?             # Class/occupation name
playbookMoves: string[]       # IDs of rules with category "playbook-move"

# Affiliations (IDs referencing other modules)
npcConnections: string[]      # NPC IDs
locationConnections: string[] # Location IDs
loreConnections: string[]     # Lore IDs
factionConnections: string[]  # Faction/lore IDs

# Stats (1-3 scale, or whatever the system uses)
stats:
  poise: number
  insight: number
  grit: number
  presence: number
  resonance: number

# Trackers (current values)
pressure: number              # 0-5
harm:
  oldWounds: string?          # Text description
  mild: string?
  moderate: string?
  severe: string?
resources: string             # "screwed" | "dry" | "light" | "covered" | "flush" | "swimming"
experience: number            # 0-5
luck: boolean                 # Has luck point or not

# Gear (open-ended list)
gear: 
  - item: string
    tags: string[]?
    notes: string?
```

Markdown body contains:

- Extended biography
- Character goals
- Notes
- Session-by-session developments
- Anything else narrative

### UI Views

**List View:**

- Card for each PC showing portrait, name, player, playbook
- Quick status indicators (pressure pips, harm level, resources)

**Detail View (Character Sheet):**

A structured layout displaying all character information. Sections:

- **Header**: Portrait, name, player, playbook, pronouns
- **Stats Block**: The five stats displayed prominently
- **Trackers Row**: Pressure (5 pips), Harm (4 slots), Resources (6-level ladder), XP (5 pips), Luck (coin)
- **Playbook Moves**: List of selected moves (clickable to view rule details)
- **Gear/Inventory**: Editable list with item + tags
- **Affiliations**: Linked NPCs, locations, lore (clickable cards)
- **Biography**: Rendered markdown body

**Editor View:**

Form-based editing for all frontmatter fields, plus markdown editor for body.

**Playbook Move Selector:**

- Opens a filtered view of Rules module (category = "playbook-move")
- Search/filter available moves
- Click to add to character's playbookMoves array
- Shows currently selected moves with option to remove

**Portrait Upload:**

- Upload image, stored in `{campaign}/assets/portraits/`
- Cropping/resizing handled client-side before save

### API Endpoints

Standard CRUD plus:

- `GET /api/modules/player-characters/:id/moves` - Get full rule data for character's playbook moves
- `POST /api/modules/player-characters/:id/portrait` - Upload portrait image
- `PATCH /api/modules/player-characters/:id/trackers` - Quick update for just tracker values (used by Live Play)

### Relationship to Live Play

Live Play module reads from and writes to Player Character files. When a tracker is updated in Live Play, it patches the PC file. This keeps a single source of truth.

---

## Module 3: Live Play

### Purpose

Session-time dashboard for tracking moment-to-moment state: pressure, harm, resources, XP, luck, gear, and ship status. Optimized for quick clicks and visibility during play.

### Data Structure

Live Play does not have its own data files. It reads from:

- Player Characters module (PC tracker state)
- A single ship file (if ship tracking is enabled)

**Ship file** lives at `{campaign}/ship.yaml` or `{campaign}/ship.md`:

```yaml
id: ship
name: string                  # Ship name
pressure: number              # 0-5
damage:
  helmControl:
    minor: string?
    major: string?
  enginesDrives:
    minor: string?
    major: string?
  sensorsArrays:
    minor: string?
    major: string?
  hullStructure:
    minor: string?
    major: string?
  powerLifeSupport:
    minor: string?
    major: string?
  weaponsBoarding:
    minor: string?
    major: string?
notes: string?
```

### UI Views

**Main Live Play View:**

A single-page dashboard divided into two sections:

**Section A: Party Tracker**

Displays all PCs side-by-side (or in a responsive grid). For each PC:

```
┌────────────────────────────────────────┐
│ [Portrait]  CHARACTER NAME             │
│             Player: ___                │
├────────────────────────────────────────┤
│ Pressure    ○ ○ ○ ○ ○                  │
│             (click to fill/unfill)     │
├────────────────────────────────────────┤
│ Harm                                   │
│   Old Wounds: [_______________]        │
│   Mild:       [_______________]        │
│   Moderate:   [_______________]        │
│   Severe:     [_______________]        │
├────────────────────────────────────────┤
│ Resources   ○ Screwed                  │
│             ○ Dry                      │
│             ○ Light                    │
│             ● Covered    ← selected    │
│             ○ Flush                    │
│             ○ Swimming in it           │
├────────────────────────────────────────┤
│ Experience  ○ ○ ○ ○ ○                  │
├────────────────────────────────────────┤
│ Luck        [🪙]  (click to toggle)    │
├────────────────────────────────────────┤
│ Gear                                   │
│   • Plasma cutter [tool, loud]         │
│   • Vac suit [armor, bulky]            │
│   [+ Add item]                         │
└────────────────────────────────────────┘
```

**Interactions:**

- Pressure pips: Click to toggle filled/empty
- Harm fields: Click to edit text inline
- Resources: Click level to select (radio-button style)
- Experience pips: Click to toggle
- Luck coin: Click to toggle has/doesn't have
- Gear: Inline add/edit/delete

All changes **immediately save** to the PC's file via the PATCH endpoint.

**Section B: Ship Tracker**

```
┌─────────────────────────────────────────────────────────┐
│ SHIP NAME                                               │
├─────────────────────────────────────────────────────────┤
│ Pressure    ○ ○ ○ ○ ○                                   │
├─────────────────────────────────────────────────────────┤
│ Damage                                                  │
│ ┌──────────────┬──────────────┬──────────────┐         │
│ │ Helm &       │ Engines &    │ Sensors &    │         │
│ │ Control      │ Drives       │ Arrays       │         │
│ ├──────────────┼──────────────┼──────────────┤         │
│ │ Minor: [___] │ Minor: [___] │ Minor: [___] │         │
│ │ Major: [___] │ Major: [___] │ Major: [___] │         │
│ ├──────────────┼──────────────┼──────────────┤         │
│ │ Hull &       │ Power &      │ Weapons &    │         │
│ │ Structure    │ Life Support │ Boarding     │         │
│ ├──────────────┼──────────────┼──────────────┤         │
│ │ Minor: [___] │ Minor: [___] │ Minor: [___] │         │
│ │ Major: [___] │ Major: [___] │ Major: [___] │         │
│ └──────────────┴──────────────┴──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**

- Pressure pips: Click to toggle
- Damage fields: Click to edit inline (open-ended text)
- Changes save immediately to ship file

### Layout Options

The Live Play view should support different arrangements:

- **Side-by-side**: All PCs in a row, ship below (good for wide screens)
- **Grid**: PCs in 2-3 column grid, ship at bottom
- **Compact**: Collapsed view showing only names + pressure (expandable)

A toggle in the header switches between layouts.

### API Endpoints

Live Play uses existing endpoints:

- `GET /api/modules/player-characters` - List all PCs
- `PATCH /api/modules/player-characters/:id/trackers` - Update tracker values
- `GET /api/campaigns/:id/files/ship` - Get ship data (or custom path)
- `PATCH /api/campaigns/:id/files/ship` - Update ship data

### Real-Time Considerations

For multiplayer access (players viewing their own trackers):

- Polling every few seconds, OR
- WebSocket connection for live updates

Start with polling (simpler). WebSocket can be added later if needed.

### Player Access

If hosted or shared:

- Players see their own PC panel (editable)
- Players see other PCs (read-only or hidden, configurable)
- Players see ship (read-only unless given permission)

For now, assume local DM use. Player access is a future enhancement.

---

## Cross-Module Integration

### Rules ↔ Player Characters

- PC's `playbookMoves` field contains rule IDs
- Character sheet fetches and displays those rules inline
- "Add Move" UI queries Rules module filtered by `category: playbook-move`

### Player Characters ↔ Live Play

- Live Play reads PC data
- Live Play writes tracker updates back to PC files
- Single source of truth (PC files), two views (full sheet vs. live tracker)

### Rules ↔ Live Play

- Live Play could have a "Quick Rules" button that opens a searchable rules panel
- Helpful for looking up moves mid-session without leaving the tracker

---

## Campaign Settings for These Modules

In `campaign.yaml`, modules can have settings:

```yaml
moduleSettings:
  rules:
    categories:
      - core-mechanic
      - action
      - general-move
      - playbook-move
      - downtime
      - harm-recovery
      - gear
      - ship
      - gm-reference
  
  player-characters:
    stats:
      - poise
      - insight
      - grit
      - presence
      - resonance
    resourceLevels:
      - screwed
      - dry
      - light
      - covered
      - flush
      - swimming
    pressureMax: 5
    experienceMax: 5
  
  live-play:
    showShipTracker: true
    shipSubsystems:
      - id: helmControl
        name: "Helm & Control"
      - id: enginesDrives
        name: "Engines & Drives"
      - id: sensorsArrays
        name: "Sensors & Arrays"
      - id: hullStructure
        name: "Hull & Structure"
      - id: powerLifeSupport
        name: "Power & Life Support"
      - id: weaponsBoarding
        name: "Weapons & Boarding"
```

This keeps the modules generic—another campaign could have different stats, different resource levels, or no ship at all.

---

## Build Order

1. **Rules Module** (standalone, no dependencies)
2. **Player Characters Module** (depends on Rules for move selection)
3. **Live Play Module** (depends on Player Characters for data)
