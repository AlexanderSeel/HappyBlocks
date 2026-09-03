# HappyBlocks

HappyBlocks is an original browser-first 3D physics puzzle game built with Babylon.js and Havok Physics V2. The core loop is: inspect a structure, aim a projectile, throw, watch the physical chain reaction, score the result, and retry instantly.

## Current vertical slice

- Babylon.js 9.23.0 + Havok 1.3.14
- Vite + strict TypeScript
- physics-backed stacked blocks
- drag/release projectile throwing
- ballistic trajectory preview
- limited projectile inventory
- objective detection and live score
- instant reset
- ArcRotate camera with throw input separated from orbit
- original low-poly glTF prototype model pack
- SVG UI/arena assets and procedural WebAudio presets
- JSON level format and two prototype levels

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
| Right mouse drag | Orbit camera |
| Mouse wheel | Zoom |
| R | Reset |

See `PLAN.md` for architecture and roadmap.
