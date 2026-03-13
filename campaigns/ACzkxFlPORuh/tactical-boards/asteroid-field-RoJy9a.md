---
id: asteroid-field-RoJy9a
name: Asteroid Field
canvasWidth: 6000
canvasHeight: 5998
gridEnabled: true
gridSize: 50
gridColor: 'rgba(255, 255, 255, 0.2)'
snapToGrid: true
hidden: false
tokens:
  - id: token-1770089926844-khhyj0vq9
    sourceType: pc
    sourceId: test
    label: Namian Namian
    image: assets/pc-portraits/test.jpg
    x: 650
    'y': 950
    size: 107
    rotation: 0
    zIndex: 1
    shape: circle
    showLabel: true
    labelPosition: below
    visibleToPlayers: true
    locked: false
  - id: token-1770089970695-38dkzpm26
    sourceType: npc
    sourceId: monster-O-C3lC
    label: Monster
    image: assets/portraits/monster-O-C3lC.jpg
    x: 250
    'y': 900
    size: 80
    rotation: 0
    zIndex: 1
    shape: circle
    showLabel: true
    labelPosition: below
    visibleToPlayers: true
    locked: false
  - id: token-1770127429197-1ls9r9yd5
    sourceType: text
    sourceId: ''
    label: |-
      Good friends 
      group
    x: 600
    'y': 700
    size: 267
    rotation: 0
    zIndex: 3
    shape: circle
    showLabel: true
    labelPosition: below
    visibleToPlayers: true
    locked: false
    width: 184
    height: 92
    fontSize: 24
    textAlign: center
  - id: token-1770134427315-63dmrrz32
    sourceType: ship
    sourceId: night-owl-qtk6wz
    label: Night Owl
    image: assets/ships/night-owl-qtk6wz.jpg
    x: 850
    'y': 800
    size: 80
    rotation: 0
    zIndex: 3
    shape: circle
    showLabel: true
    labelPosition: below
    visibleToPlayers: true
    locked: false
background: assets/board-backgrounds/asteroid-field-RoJy9a.jpg
backgroundScale: 1
backgroundX: 0
backgroundY: 0
connections:
  - id: conn-1770133947252-3moxun1af
    fromTokenId: token-1770127429197-1ls9r9yd5
    toTokenId: token-1770089926844-khhyj0vq9
    color: '#00ffff'
    style: solid
    thickness: 2
    animated: true
  - id: conn-1770133951647-rs4j4sxre
    fromTokenId: token-1770089970695-38dkzpm26
    toTokenId: token-1770127429197-1ls9r9yd5
    color: '#00ffff'
    style: solid
    thickness: 2
    animated: true
  - id: conn-1770157173493-p39w18dzj
    fromTokenId: token-1770127429197-1ls9r9yd5
    toTokenId: token-1770134427315-63dmrrz32
    color: '#00ffff'
    style: solid
    thickness: 2
    animated: true
animationsEnabled: false
fogCells: []
fogEnabled: false
showInitiativePanel: false
initiativePanelPosition: bottom
---

