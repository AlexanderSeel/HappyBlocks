# HappyBlocks

HappyBlocks is an original browser-first 3D physics puzzle game built with Babylon.js and Havok Physics V2. The core loop is to inspect a structure, choose the right interaction, trigger a physical chain reaction, and optimize the result.

## Current playable build

- Babylon.js 9.23.0 + Havok 1.3.14
- Vite + strict TypeScript
- glTF visuals separated from primitive Havok collision proxies
- drag/release throwing with ballistic trajectory preview
- standard, heavy and radial-pulse projectiles
- authored breakable columns and hinged spinner mechanisms
- material-specific friction/restitution including rubber bumpers
- collision-driven procedural audio, score combos and impact VFX
- settled-world detection
- Throw, Chain Reaction, Remove and Protect gameplay modes
- limited block-pull interaction for Remove levels
- continuous protected-object failure conditions
- three-star results, retry and next-level flow
- sequential level unlocks with best score/stars persisted in localStorage
- adaptive mobile/low-power render profile and reduced VFX density
- safe-area/touch-size UI tuning and optional vibration feedback
- reduced-motion-aware effects
- F3 physics/performance debug overlay
- in-browser level editor foundation with entity transform controls, JSON import/export and deterministic physics Preview/Restore
- five authored prototype levels
- JSON level schema
- original low-poly glTF prototype model pack

## Run

```bash
npm install
npm run dev
```

Validation/build:

```bash
npm run typecheck
npm run build
```

## Controls

| Input | Action |
|---|---|
| Left mouse / touch drag | Aim and set throw power |
| Release | Throw |
| Click/tap removable block | Pull block in Remove mode |
| Right mouse drag | Orbit camera |
| Mouse wheel | Zoom |
| 1 / 2 / 3 | Select projectile |
| R | Reset |
| F3 | Physics/performance debug overlay |
| Ctrl/Cmd + E | Toggle level editor |

### Level editor

Open **Editor** from the HUD or press `Ctrl/Cmd + E`. Select an entity to edit position, rotation and scale, or edit the complete level JSON directly. **Preview** rebuilds the Babylon/Havok scene from the working JSON. Preview completions intentionally do not unlock levels or write progression. **Restore** reloads the authored level. Import and Export use standalone HappyBlocks level JSON files.

See `PLAN.md` for architecture and roadmap.
