# HappyBlocks

HappyBlocks is an original browser-first 3D physics puzzle game built with Babylon.js and Havok Physics V2. The core loop is to scout a structure, choose an interaction or projectile, trigger a physical chain reaction, and optimize the result for score and stars.

## Current playable build

### Runtime

- Babylon.js 9.23.0 + Havok 1.3.14
- Vite + strict TypeScript
- primitive/convex Havok collision bodies separated from detailed render shells
- real triangular-prism wedge geometry with `CONVEX_HULL` collision
- drag/release throwing with ballistic trajectory preview
- Standard, Heavy and radial Pulse projectiles with distinct mass/velocity behavior
- authored breakable columns and hinged spinner mechanisms
- material-specific friction/restitution including rubber ricochet bumpers
- collision-driven procedural audio, combo scoring and impact VFX
- settled-world detection and deterministic reset/rebuild
- Throw, Chain Reaction, Remove, Protect and Score Attack gameplay modes
- Score Attack consumes the complete shot budget and finishes after the final physics chain settles
- limited block-pull interaction for Remove levels
- continuous protected-object failure conditions
- three-star results, retry and next-level flow
- sequential unlocks with best score/stars persisted in localStorage
- adaptive mobile/low-power rendering and reduced VFX density
- safe-area/touch-size UI tuning, reduced-motion support and optional vibration feedback
- F3 physics/performance debug overlay

### Camera and scouting

The play camera is deliberately not locked to a single presentation angle. You can scout dense structures before taking a shot:

- WASD — move the camera target horizontally
- Q / E — lower / raise scouting height
- Shift — scouting boost
- right mouse drag — orbit
- mouse wheel — zoom
- left mouse / touch drag — aim and charge a throw

Gameplay movement/throw input is isolated while the live editor or form fields are active.

## Live 3D level editor

Open **3D Editor** from the HUD or press `Ctrl/Cmd + E`.

The in-browser Babylon editor currently supports:

- direct 3D entity selection and selection highlighting
- Babylon move/rotate/scale gizmos
- configurable transform snapping
- asset, material and motion-type changes
- live mesh rebuilding when an asset changes
- create, duplicate and delete
- grouped undo/redo history
- complete JSON import/export
- Havok **Physics Preview** and authored-level **Restore**
- deterministic whole-level procedural generation
- reusable modular structure insertion
- gameplay/physics rules authoring
- objective creation
- level identity, arena, gravity and camera authoring
- score/combo/star-threshold authoring

Editor preview completions intentionally do **not** unlock campaign levels or write progression.

### Whole-level generator

The procedural generator can replace the current working level with seeded, repeatable structures:

- Tower
- Bridge
- Domino Chain
- Fortress
- Physics Chaos

Complexity and seed are editable in the panel, and the result appears immediately in the editor viewport before Havok preview.

### Reusable structure palette

Modules are inserted as normal independent level entities rather than opaque prefabs, so every resulting block remains editable afterward.

Available modules:

- Watchtower
- Gatehouse
- Bridge Span
- Rampart
- Ricochet Station

Insertion uses the selected entity's X/Z position, an explicit base Y, and selectable 0° / 90° / 180° / 270° yaw. This makes it practical to assemble larger layouts without manually rotating every generated part.

### Gameplay & Physics authoring

Common gameplay data can be edited without dropping into raw JSON:

- level mode
- Standard / Heavy / Pulse inventory
- Remove pull count
- selected-entity tags
- mass scale
- break threshold
- Knock Down objective
- Move Below Y objective
- Protect objective
- Removed objective

### Level, Arena & Camera authoring

The editor also exposes:

- level ID and display name
- square/round arena platform
- gravity X/Y/Z
- camera target X/Y/Z
- camera alpha/beta/radius
- camera minimum/maximum radius
- one-click camera targeting of the selected entity

### Scoring & Stars authoring

Scoring can be tuned live with:

- base score
- projectile penalty
- time penalty per second
- combo impact window
- combo multiplier
- 1/2/3-star thresholds

Star thresholds are normalized to a strictly ascending sequence so exported/generated levels stay compatible with content validation.

The advanced JSON editor remains available for the complete level document.

## Authored levels

The current campaign/prototype progression contains eight levels:

1. First Collapse
2. Crossfire
3. Ricochet Lab
4. Precision Pull
5. Guardian
6. Sky Citadel
7. Iron Labyrinth
8. Combo Foundry

**Iron Labyrinth** is a large chain-reaction stress layout with reinforced towers, trusses, breakable gates, real wedge ramps, ricochet stations and a domino path into the goal structure.

**Combo Foundry** is the first dedicated Score Attack arena. It combines a round arena, four ricochet stations, dual spinners, breakable towers, bridge/truss structures and two domino feeds. Every shot must be spent; the final score is awarded after the last chain settles.

## Rendering and standalone PBR assets

HappyBlocks uses file-backed reusable WebP PBR material kits. Runtime canvas texture synthesis is no longer the normal rendering path.

Texture root:

```text
public/assets/textures/pbr/
```

Six material families are included:

- wood
- stone
- metal
- rubber
- ceramic
- energy

Each material has Base Color, tangent-space Normal and packed ORM maps. Energy additionally has an Emissive map.

ORM packing:

```text
R = Ambient Occlusion
G = Roughness
B = Metallic
```

Two generated profiles are committed:

| Profile | Base Color | Normal / ORM / Emissive |
|---|---:|---:|
| HD | 2048² | 1024² |
| Mobile | 1024² | 512² |

The renderer selects the mobile profile on constrained/coarse-pointer devices and the HD profile otherwise.

### Rebuilding the texture pack

The source generator is deterministic:

```bash
python tools/generate_texture_kit.py
```

`.github/workflows/generate-textures.yml` regenerates the pack, validates all 38 WebP maps across both profiles, and commits changed binary assets back to `main`.

The machine-readable texture manifest is:

```text
public/assets/textures/pbr/manifest.json
```

## Reusable UI / item kit

A standalone component overview is available from the app at:

```text
/ui-kit/
```

The kit uses independent HTML/CSS components rather than sprite sheets or cut-out SVG atlases. It includes button variants, HUD stats, projectile chips, objective cards, level cards, reticle, power meter and editor tool icons.

Files:

```text
public/ui-kit/index.html
public/ui-kit/components.css
public/ui-kit/manifest.json
public/ui-kit/README.md
```

## Run locally

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run validate:content
npm run typecheck
npm run build
```

`validate:content` checks static data that TypeScript cannot verify, including:

- runtime model files
- runtime assets against the public asset manifest
- HD/mobile PBR manifest files
- level IDs and entity IDs
- level asset references
- transforms and motion values
- projectile inventory
- objective target tags
- ascending three-star score thresholds

CI runs content validation, strict TypeScript and the Vite production build for every push/PR to `main`.

## Main controls

| Input | Action |
|---|---|
| Left mouse / touch drag | Aim and set throw power |
| Release | Throw |
| Click/tap removable block | Pull block in Remove mode |
| Right mouse drag | Orbit camera |
| Mouse wheel | Zoom |
| W / A / S / D | Scout horizontally |
| Q / E | Scout height |
| Shift | Scout movement boost |
| 1 / 2 / 3 | Select projectile |
| R | Reset |
| F3 | Physics/performance debug overlay |
| Ctrl/Cmd + E | Toggle live 3D editor |

## Repository structure

```text
src/game/                 gameplay, physics, editor and rendering systems
src/game/editor/          live viewport, generators, rules, camera and scoring authoring
src/game/rendering/       PBR material library and detailed procedural render shells
public/levels/            authored JSON levels
public/assets/models/     reusable glTF model pack
public/assets/textures/   standalone texture assets and manifests
public/ui-kit/            reusable interface/item kit
tools/                    deterministic asset generation and content validation
.github/workflows/        CI and texture-generation automation
```

See `PLAN.md` for the broader architecture and roadmap.
