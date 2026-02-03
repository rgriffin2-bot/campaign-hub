---
id: example-faction
name: Faction Name
type: institutional # institutional, belief-driven, commercial, frontier, security, political, criminal, other
description: >-
  A brief description shown on the faction card in the grid view.
  Keep this to 1-2 sentences.
affinity: 0 # Standing with the crew: -3 (Open Hostilities) to +3 (Allies)
location: Where they're based or operate
leader: The person who leads or represents them
affiliations: # Related NPCs or other factions
  - related-npc-id
  - allied-faction-id
hidden: false # Set to true to hide from players until revealed
tags:
  - tag1
  - tag2
dmOnly:
  secrets: >-
    Hidden information about this faction. True allegiances, hidden agendas,
    plot-relevant secrets the players shouldn't know.
  notes: >-
    DM notes for running this faction. How they operate, what they want,
    how they might react to player actions.
---

# Overview

Write detailed notes about this faction using Markdown formatting. This section is player-visible (unless the entry is hidden).

## History

Background and origin of the faction.

## Goals and Motivations

What does this faction want? What drives their actions?

## Resources and Capabilities

What assets, influence, or power does this faction have?

## Key Members

Notable individuals within the faction:
- [[npcs:leader-id]] - Leader or spokesperson
- [[npcs:member-id]] - Other notable members

## Relationships

How this faction relates to others:
- Allied with [[factions:ally-id]]
- Rivals of [[factions:rival-id]]
- Neutral toward most others

## Typical Interactions

How the crew might encounter or interact with this faction:
- At their headquarters in [[locations:hq-id]]
- Through their representatives
- During specific events or missions

---

## Affinity Reference

Standing is tracked from +3 to -3:

- **+3 Allies** - Trusted partners, will take meaningful risks
- **+2 Friendly** - Reliable support, basic access available
- **+1 Helpful** - Will assist when cost is low
- **0 Neutral** - Indifferent, systems default against you
- **-1 Interfering** - Look for safe ways to inconvenience you
- **-2 Adversarial** - Actively work against you
- **-3 Open Hostilities** - Consider you an active threat

