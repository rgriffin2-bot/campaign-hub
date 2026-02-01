---
id: example-ship
name: Ship Name
type: starship # starship, vehicle, submersible, mech, drone
class: freighter # freighter, interceptor, capital, industrial, etc.
owner: # Person or faction that owns/controls it
isCrewShip: false # Set to true if controlled by the player crew
affiliations: # Related characters or factions
  - faction-id
appearance: >-
  Physical description of the ship. Size, shape, distinctive features,
  condition, notable modifications.
characteristics: # Open-ended tags
  - fast
  - heavily-armed
  - stealth-capable
notes: >-
  General notes about this ship (visible to players if not hidden).
  Can use Markdown formatting.
image: # Path to ship image (optional)
hidden: false # Set to true to hide from players
disposition: neutral # hostile, friendly, or neutral (for scene display)
pressure: 0 # Pressure tracker (0-5)
damage: # Subsystem damage (minor and major for each)
  helmControl:
    minor: # Description of minor damage
    major: # Description of major damage
  enginesDrives:
    minor:
    major:
  sensorsArrays:
    minor:
    major:
  hullStructure:
    minor:
    major:
  powerLifeSupport:
    minor:
    major:
  weaponsBoarding:
    minor:
    major:
tags:
  - tag1
  - tag2
dmOnly:
  secrets: >-
    Information only the DM should know. Hidden capabilities, true allegiances,
    plot-relevant secrets.
  notes: >-
    DM notes for running encounters with this ship. Plot hooks, tactical notes,
    connections to other entities.
---

Write your ship content here using Markdown formatting. This section is completely open-ended - structure it however makes sense for your content.

You can use any Markdown features:
- Headers (# ## ###)
- **Bold** and *italic* text
- Lists and numbered lists
- > Blockquotes
- `code` and code blocks
- Tables
- And more

To reference other entries, use wiki-style links:
- [[lore:entry-id]] - Link to a lore entry
- [[npcs:character-id]] - Link to an NPC
- [[locations:place-id]] - Link to a location
- [[ships:ship-id]] - Link to another ship

