---
id: _map-config
name: Map Configuration
backgroundColor: '#0a0a12'
backgroundType: starfield # Options: color, starfield, nebula, gradient
nebulaColors: # Colors used when backgroundType is 'nebula'
  - '#3a2a5a'
  - '#5a3a4a'
  - '#2a5a5a'
  - '#5a5a3a'
mapWidth: 2400
mapHeight: 2400
defaultOrbitColor: '#2A3A4A'
defaultOrbitStyle: solid # Options: solid, dashed, dotted
fontFamily: # Optional custom font for labels
---

# Map Configuration

This file controls the visual settings for the star system map. Place this file in the `locations` folder of your campaign as `_map-config.md`.

## Background Settings

- **backgroundColor**: The base color of the map background (hex color)
- **backgroundType**: Visual style of the background
  - `color`: Solid color only
  - `starfield`: Scattered stars on the background color
  - `nebula`: Colorful nebula clouds using nebulaColors
  - `gradient`: Gradient effect
- **nebulaColors**: Array of hex colors used when backgroundType is `nebula`

## Map Dimensions

- **mapWidth**: Width of the map canvas in pixels (default: 2400)
- **mapHeight**: Height of the map canvas in pixels (default: 2400)

## Orbit Styling

- **defaultOrbitColor**: Default color for orbit lines (can be overridden per body)
- **defaultOrbitStyle**: Default line style for orbits
  - `solid`: Continuous line
  - `dashed`: Dashed line
  - `dotted`: Dotted line

## Font

- **fontFamily**: Optional custom font family for labels (e.g., `'Orbitron, sans-serif'`)
