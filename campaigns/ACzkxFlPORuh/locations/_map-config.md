---
id: _map-config
name: Map Configuration
backgroundColor: '#0a0a12'
backgroundType: starfield
nebulaColors:
  - '#3a2a5a'
  - '#5a3a4a'
  - '#2a5a5a'
  - '#5a5a3a'
mapWidth: 2400
mapHeight: 2400
defaultOrbitColor: '#2A3A4A'
defaultOrbitStyle: dashed
---
# Map Configuration

This file controls the visual settings for the star system map.

## Background Settings
- **backgroundColor**: The base color of the map background
- **backgroundType**: One of `color`, `starfield`, `nebula`, or `gradient`
- **nebulaColors**: Array of colors used when backgroundType is `nebula`

## Map Dimensions
- **mapWidth**: Width of the map in pixels (default: 2400)
- **mapHeight**: Height of the map in pixels (default: 2400)

## Orbit Styling
- **defaultOrbitColor**: Default color for orbit lines
- **defaultOrbitStyle**: Default style (`solid`, `dashed`, or `dotted`)

## Font
- **fontFamily**: Optional custom font for labels
