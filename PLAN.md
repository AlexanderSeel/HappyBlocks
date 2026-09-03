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
- Prefer BOX/SPHERE/CYLINDER/CONVEX/compound physics proxies; do not default visual meshes to triangle-mesh colliders.
- Standard projectile radius ~0.38 m, mass ~1.8 gameplay kg.
- Heavy projectile radius ~0.52 m.
- Gravity defaults to 9.81 m/s².
- Enable sleeping and add a settled-world detector before turn finalization.
- Use authored segmented breakables instead of runtime fracture for the first production version.
- Route collision impulse/relative velocity into audio, particles, scoring and break thresholds.

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
- [x] First stack-collapse puzzle.
- [x] Drag/release throw input.
- [x] Ballistic trajectory preview.
- [x] Projectile inventory.
- [x] `moveBelowY` and `knockDown` objective evaluation.
- [x] Score/HUD and fast reset.
- [x] Procedural WebAudio throw/goal effects.
- [x] Original prototype 3D model library plus icons/textures/particle presets.
- [x] GitHub Actions typecheck/build workflow.

## Next implementation block
1. Load glTF visuals through Babylon `AssetContainer` while retaining primitive physics proxies.
2. Add collision impulse routing and impact audio intensity.
3. Implement sleep/velocity-based world-settled detection.
4. Implement segmented breakable columns.
5. Implement hinge spinner for prototype level 002.
6. Add standard/heavy/pulse projectile selector.
7. Add stars/results/next-level flow.
8. Tune touch controls and mobile performance.
9. Add a developer level editor/physics debug overlay.

## Asset set
The prototype pack contains structural blocks, cylinder/wedge pieces, platforms, standard/heavy/pulse projectiles, goal core, target totem, bumper, spinner, arch and segmented column. Production art can replace visuals without changing canonical physics dimensions.
