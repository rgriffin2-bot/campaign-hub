# Campaign Hub Templates

This folder contains template files for creating campaign content. Each template shows the full YAML frontmatter structure with all available fields.

## Available Templates

| Template | Description |
|----------|-------------|
| `npc.md` | Non-player character with personality, goals, and DM-only secrets |
| `lore.md` | World-building entries (factions, history, religion, magic, etc.) |
| `location.md` | Places without celestial/map data |
| `location-celestial.md` | Celestial bodies (stars, planets, moons, stations) for the star system map |
| `map-config.md` | Configuration for the star system map visual settings |

## How to Use

1. Copy the relevant template to your campaign's folder:
   - NPCs go in `campaigns/{id}/npcs/`
   - Lore goes in `campaigns/{id}/lore/`
   - Locations go in `campaigns/{id}/locations/`

2. Rename the file to match your content (use kebab-case: `my-cool-npc.md`)

3. Update the `id` field to match the filename (without `.md`)

4. Fill in the fields you need - most fields are optional

## Field Notes

### Common Fields

- **id**: Must match the filename (without .md extension)
- **name**: Display name shown in the UI
- **hidden**: Set to `true` to hide from players until revealed
- **tags**: Array of strings for filtering and organization

### Wiki-Style Links

Reference other entries using double-bracket syntax:
- `[[npcs:character-id]]` - Link to an NPC
- `[[lore:entry-id]]` - Link to a lore entry
- `[[locations:place-id]]` - Link to a location

### DM-Only Content

The `dmOnly` section is never shown to players. Use it for:
- **secrets**: Hidden information, true motivations
- **notes**: Running notes, atmosphere guidance
- **plotHooks**: Adventure seeds (locations only)
- **voice**: Roleplay guidance (NPCs only)

### Celestial Bodies

For locations that appear on the star system map, add the `celestial` section. Key fields:
- **bodyType**: `star`, `planet`, `moon`, `station`, or `asteroid_ring`
- **orbitDistance**: How far from parent (in map units)
- **radius**: Visual size on the map
- **parent**: ID of the body this orbits (leave empty for central star)

## Map Configuration

To customize the star system map appearance, create `_map-config.md` in your locations folder. The underscore prefix keeps it from appearing in the location list.
