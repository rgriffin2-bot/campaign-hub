---
id: character-name
# The id must be a lowercase version of the character name with hyphens between words
# Example: "Aria Chen" → "aria-chen"

name: Character Name
player: Player's Real Name
playerVisible: true # Always true for player characters

# Demographics & Biography
portrait: # Path to portrait image, set automatically when you upload via the editor
pronouns: # e.g., she/her, he/him, they/them
species: Human # e.g., Human, Android, Uplifted
age: # Age or age range
appearance: # Brief physical description
background: # One-line background summary

# Class/Occupation
playbook: # e.g., Scoundrel, Mechanic, Stitch
playbookMoves: [] # IDs of rules with category "playbook-move"

# Affiliations (IDs referencing other modules)
npcConnections: []    # NPC IDs
locationConnections: [] # Location IDs
loreConnections: []    # Lore IDs

# Stats (0-4 scale)
stats:
  poise: 0
  insight: 0
  grit: 0
  presence: 0
  resonance: 0

# Trackers
pressure: 0    # 0-5
harm:
  oldWounds:   # Long-term injury description
  mild:        # Minor injury description
  moderate:    # Moderate injury description
  severe:      # Severe/critical injury description
resources: covered  # screwed | dry | light | covered | flush | swimming
experience: 0  # 0-5
luck: true     # Has luck point or not

# Gear
gear:
  - item: Example Item
    tags:
      - tag1
      - tag2
    notes: Optional notes about this item
---

Write extended biography, character goals, session developments, and other notes here using Markdown formatting.

## Goals

- Short-term goal
- Long-term goal

## Session Notes

### Session 1
Notes from session 1...

## Relationships

Key relationships and how they've developed...
