# Changelog

## 2026-02-14 (session 2)

**What changed:** Switched from ngrok to Cloudflare Tunnel for remote player access, reduced live play polling from 3 seconds to 1 second, and increased the rate limit to 5000 req/15min to support 5 players + DM.

**Why:** Free ngrok has per-minute connection caps that would throttle 1-second polling. Cloudflare Tunnel's free "quick tunnel" has no such limit. Faster polling makes dice rolls, initiative changes, and scene updates feel near-instant for players.

---

## 2026-02-14

**What changed:** Created `PROJECT.md` and `CHANGELOG.md` to meet documentation standards. Beginning a full code commenting pass across the entire codebase (~155 source files).

**Why:** New global coding session instructions (`CLAUDE.md`) require these docs and a commenting standard. CampaignHub predates those instructions, so this session brings it into compliance.

---

*Prior to this date, Campaign Hub was developed without a changelog. The project is a full-stack tabletop RPG campaign management tool with 12+ modules, DM/player role separation, file-based markdown storage, and a macOS launcher app. See `PROJECT.md` for the full project overview.*
