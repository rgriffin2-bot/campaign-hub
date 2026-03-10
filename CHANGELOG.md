# Changelog

## 2026-03-10 (session 4)

### 3D Solar System Map & Holographic HUD

**What changed:** Added a full 3D solar system map using React Three Fiber with wireframe celestial bodies, FBM noise nebula, and asteroid belts. Includes GPU holographic post-processing (scan lines, sweep band, vignette, film grain) via Three.js EffectComposer/ShaderPass. HUD-style selection brackets billboard to face camera. Search bar finds and zooms to bodies. Detail sidebar redesigned as a sci-fi clipped panel with beveled corners (CSS clip-path), blue glow borders (drop-shadow), and monospace typography. Player-side map now uses the shared FullMapView component instead of a sandboxed iframe. Added three.js, @react-three/fiber, and @react-three/drei dependencies.

**Why:** The flat location list didn't convey the spatial relationships between celestial bodies in the campaign's star system. The 3D map gives players an immersive, interactive way to explore the system, with the holographic overlay and HUD panel reinforcing the sci-fi setting.

---

## 2026-02-27 (session 3)

### Session 3: Raspberry Pi Deployment Support

**What changed:** Added production static file serving to the Express server (so one process serves both API and frontend), created systemd service files for auto-start on boot (`deploy/campaignhub.service`, `deploy/campaignhub-tunnel.service`), a deploy script for pushing updates from Mac to Pi (`scripts/deploy.sh`), and a first-time Pi setup script (`scripts/pi-setup.sh`). Updated `PROJECT.md` with Pi deployment docs.

**Why:** To support running Campaign Hub as an always-on server on a Raspberry Pi, removing the need to have the Mac running during game sessions. The key code change was adding an SPA catch-all in the Express server for production mode — previously the server only served the API, relying on Vite's dev server for the frontend.

---

## 2026-02-14 (session 2)

**What changed:** Switched from ngrok to Cloudflare Tunnel for remote player access, reduced live play polling from 3 seconds to 1 second, and increased the rate limit to 5000 req/15min to support 5 players + DM.

**Why:** Free ngrok has per-minute connection caps that would throttle 1-second polling. Cloudflare Tunnel's free "quick tunnel" has no such limit. Faster polling makes dice rolls, initiative changes, and scene updates feel near-instant for players.

---

## 2026-02-14

**What changed:** Created `PROJECT.md` and `CHANGELOG.md` to meet documentation standards. Beginning a full code commenting pass across the entire codebase (~155 source files).

**Why:** New global coding session instructions (`CLAUDE.md`) require these docs and a commenting standard. CampaignHub predates those instructions, so this session brings it into compliance.

---

*Prior to this date, Campaign Hub was developed without a changelog. The project is a full-stack tabletop RPG campaign management tool with 12+ modules, DM/player role separation, file-based markdown storage, and a macOS launcher app. See `PROJECT.md` for the full project overview.*
