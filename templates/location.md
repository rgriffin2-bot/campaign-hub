---
id: example-location-entry
# The id must be a lowercase version of the name with hyphens between words
# Example: "The Kingdom of Valdris" → "the-kingdom-of-valdris"
name: Example Location Entry
type: City # Suggestions: Star, Planet, Moon, Station, Asteroid Belt, Continent, Ocean, Region, Country, Province, City, Town, Village, District, Building, Room, Dungeon, Cave, Forest, Mountain, Island
parent: parent-location-id # ID of parent location (optional)
description: Brief one-line description for cards and sidebars
image: # Path to landscape image (optional)
hidden: false # Set to true to hide from players until revealed
treeRoot: false # Set to true to show as root in tree view even if it has a parent
tags:
  - tag1
  - tag2
dmOnly:
  secrets: >-
    Hidden information about this location. Secret passages, hidden treasures,
    true nature of the place.
  plotHooks: >-
    Adventure hooks and story seeds connected to this location. What might
    draw the players here?
  notes: >-
    DM notes for running this location. Encounter ideas, important NPCs,
    atmosphere and mood.
---

Write your location content here using Markdown formatting. This section is completely open-ended - structure it however makes sense for your content.

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

