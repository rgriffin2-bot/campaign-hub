---
id: example-rule
# The id must be a lowercase version of the name with hyphens between words
# Example: "Action Roll" → "action-roll"

name: Example Rule
category: core-mechanic
# Category options:
#   core-mechanic    - Basic dice rolling, position/effect, etc.
#   action           - The 12 actions (Scramble, Skulk, Smash, etc.)
#   general-move     - Moves anyone can use (Aid, Setup, Flashback, etc.)
#   playbook-move    - Class-specific moves (selectable by PCs)
#   downtime         - Downtime activities
#   harm-recovery    - Harm, healing, death mechanics
#   gear             - Equipment rules and item tags
#   ship             - Ship mechanics, damage, etc.
#   gm-reference     - GM-only rules and guidance

subcategory: # Optional: finer categorization within the main category
tags:
  - tag1
  - tag2
playerVisible: true # Set to false to hide from players (GM-only rules)
source: Core Rules # Optional: e.g., "Core Rules", "Expansion", "Homebrew"
---

Write your rule content here using Markdown formatting. This section is completely open-ended - structure it however makes sense for your content.

You can use any Markdown features:
- Headers (# ## ###)
- **Bold** and *italic* text
- Lists and numbered lists
- > Blockquotes
- `code` and code blocks
- Tables
- And more

