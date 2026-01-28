---
id: example-planet
# The id must be a lowercase version of the name with hyphens between words
# Example: "The Kingdom of Valdris" → "the-kingdom-of-valdris"
name: Example Planet
type: Planet # For celestial bodies: Star, Planet, Moon, Station, Asteroid Belt
parent: parent-star-or-planet-id # ID of what this orbits (stars have no parent)
description: Brief one-line description for cards and sidebars
image: # Path to landscape image (optional)
hidden: false # Set to true to hide from players until revealed
treeRoot: false # Set to true to show as root in tree view even if it has a parent
tags:
  - habitable
  - colony
celestial:
  bodyType: planet # Options: star, planet, moon, station, asteroid_ring
  orbitDistance: 200 # Distance from parent in map units
  orbitShape: circle # Options: circle, ellipse
  orbitEccentricity: 0 # For ellipse: 0-0.99 (0 = circle)
  orbitRotation: 0 # For ellipse: rotation in degrees
  startPosition: 0 # Initial angle on orbit (0-359, 0 = top)
  radius: 12 # Visual size on map
  color: '#4A90D9' # Fallback color if no mapImage
  orbitColor: '#4A90D9' # Color of orbit line (optional, uses default if not set)
  orbitStyle: solid # Options: solid, dashed, dotted
  showLabel: true # Show name label on map
  mapImage: # Path to image for map visualization (optional)
  ringWidth: 20 # For asteroid_ring type only
dmOnly:
  secrets: Hidden information about this celestial body.
  plotHooks: Adventure hooks related to this location.
  notes: DM notes for this location.
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
