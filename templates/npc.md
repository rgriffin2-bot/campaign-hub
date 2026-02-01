---
id: example-npc
name: NPC Name
occupation: Their role or job
location: Where they can be found
appearance: >-
  Physical description of the character. Height, build, distinctive features,
  typical clothing, mannerisms.
personality: >-
  How they behave, their temperament, notable traits. What motivates them in
  social interactions.
goals: >-
  What they want to achieve. Short-term and long-term objectives that drive
  their actions.
portrait: # Path to portrait image (optional)
portraitPosition: # Position/zoom for circular crop (optional)
  x: 0
  'y': 0
  scale: 1
hidden: false # Set to true to hide from players until revealed
hasStats: false # Set to true if this NPC has a stat block (for combat or other purposes)
disposition: neutral # hostile, friendly, or neutral - affects grouping in Live Play
stats: # Combat stats (only used if hasStats is true)
  damage: 0 # Current damage taken (start at zero)
  maxDamage: 10 # Damage threshold - scale with threat level
  armor: 0 # Armor rating as appropriate
  moves: # Combat moves or abilities (markdown)
tags:
  - tag1
  - tag2
relatedCharacters:
  - id: other-npc-id
    description: How they're related
dmOnly:
  secrets: >-
    Information only the DM should know. Hidden motivations, true allegiances,
    plot-relevant secrets.
  voice: >-
    How to roleplay this character. Speech patterns, accent, verbal tics,
    catchphrases.
  notes: >-
    DM notes for running this character. Plot hooks, potential quests,
    connections to other NPCs.
---

Write your npc content here using Markdown formatting. This section is completely open-ended - structure it however makes sense for your content.

You can use any Markdown features:
- Headers (# ## ###)
- **Bold** and *italic* text
- Lists and numbered lists
- > Blockquotes
- `code` and code blocks
- Tables
- And more

To reference other entries, use wiki-style links:
- [[lore:entry-id]] - Link to another lore entry
- [[npcs:character-id]] - Link to an NPC
- [[locations:place-id]] - Link to a location

