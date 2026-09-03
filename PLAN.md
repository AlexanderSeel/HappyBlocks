# PLAN.md — HappyBlocks

## Goal
Build a browser-first 3D physics puzzle game centered on tactile block structures, thrown objects, collapse chains, precision and score. The mechanics may be inspired by the structural-physics genre, but HappyBlocks uses original branding, art, levels, UI and assets.

## Technical baseline
- Babylon.js `@babylonjs/core` 9.23.0.
- Babylon Physics V2 with `@babylonjs/havok` 1.3.14.
- TypeScript + Vite.
- WebGL2 baseline; WebGPU can be added later as an optional quality path.
- glTF for runtime models and JSON for levels/configuration.
- 1 game unit = 1 meter, +Y up.

## Physics rules
- Prefer BOX/SPHERE/CYLINDER/CAPSULE/CONVEX/compound physics proxies; do not default visual meshes to triangle-mesh colliders.
- Visual glTF geometry is independent from primitive Havok collision proxies.
- Standard projectile radius ~0.38 m, mass ~1.8 gameplay kg.
- Heavy projectile radius ~0.52 m, mass ~4.6 gameplay kg.
- Pulse projectile uses a capsule proxy and a single collision-triggered radial impulse.
- Gravity defaults to 9.81 m/s².
- Collision solver impulse drives impact audio, score combos and authored break thresholds.
- Settle detection uses linear/angular velocity thresholds and a quiet-time window.
- Use authored segmented breakables instead of runtime mesh fracture for the first production version.

## Core modes
1. Throw — limited projectiles to collapse or displace targets.
2. Remove — pull one allowed block from a structure.
3. Protect — achieve a destructive goal while preserving protected pieces.
4. Chain Reaction — use bumpers, hinges, rolling pieces and breakables.
5. Score Attack — optimize score with limited inventory.

## Vertical slice — implemented
- [x] Vite + strict TypeScript application.
- [x] Babylon.js scene/camera/light foundation.
- [x] Havok Physics V2 initialization.
- [x] Data-driven level loader.
- [x] Canonical asset/collider registry.
- [x] Physics-backed block/entity factory.
- [x] glTF visual asset container cache and instancing/cloning.
- [x] Primitive physics proxy separated from rendered geometry.
- [x] First stack-collapse puzzle.
- [x] Second chain-reaction prototype level selectable in HUD.
- [x] Drag/release throw input and ballistic trajectory preview.
- [x] Standard/heavy/pulse projectile selector and per-type inventory.
- [x] Pulse projectile radial Havok impulse with expanding energy-wave VFX.
- [x] `moveBelowY` and `knockDown` objective evaluation.
- [x] Score/HUD and fast reset.
- [x] Collision impulse score bonuses and combo multiplier/window.
- [x] Three-star result thresholds, retry and next-level flow.
- [x] Collision impulse routed into procedural impact audio.
- [x] Velocity-based settled-world detection.
- [x] Authored five-segment breakable columns.
- [x] Havok hinge mechanism for spinner entities.
- [x] Procedural WebAudio throw/impact/pulse/goal effects.
- [x] Original prototype 3D model library plus icons/textures/particle presets.
- [x] GitHub Actions typecheck/build workflow.

## Next implementation block
1. Add dust, ceramic shard and impact spark particle systems.
2. Add bumper-specific restitution and interaction effects.
3. Add protect-zone and remove-block modes.
4. Tune touch controls, haptics hooks and mobile performance.
5. Add a developer physics debug overlay and performance counters.
6. Add in-browser level editor with transform gizmos and JSON import/export.
7. Add progression metadata, local persistence and a broader authored level pack.
8. Add production audio assets and adaptive mix snapshots.

## Asset set
The prototype pack contains structural blocks, cylinder/wedge pieces, platforms, standard/heavy/pulse projectiles, goal core, target totem, bumper, spinner, arch and segmented column. Production art can replace visuals without changing canonical physics dimensions.
