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
- Surface tuning is data-oriented: wood, stone, ceramic, metal, rubber/bumper and energy objects have different friction/restitution.
- Standard projectile radius ~0.38 m, mass ~1.8 gameplay kg.
- Heavy projectile radius ~0.52 m, mass ~4.6 gameplay kg.
- Pulse projectile uses a capsule proxy and a single collision-triggered radial impulse.
- Gravity defaults to 9.81 m/s².
- Collision solver impulse drives impact audio, VFX, score combos and authored break thresholds.
- Settle detection uses linear/angular velocity thresholds and a quiet-time window.
- Use authored segmented breakables instead of runtime mesh fracture for the first production version.

## Core modes
1. Throw — limited projectiles to collapse or displace targets.
2. Remove — pull a limited number of tagged blocks while preserving structural goals.
3. Protect — achieve destructive objectives while continuously preserving protected pieces.
4. Chain Reaction — use bumpers, hinges, rolling pieces and breakables.
5. Score Attack — optimize score with limited inventory.

## Vertical slice — implemented
- [x] Vite + strict TypeScript application.
- [x] Babylon.js scene/camera/light foundation and Havok Physics V2.
- [x] Data-driven level loader/schema and canonical asset/collider registry.
- [x] glTF visual cache separated from primitive Havok proxies.
- [x] Square/round arenas, surface physics and high-bounce bumpers.
- [x] Drag/release throw input and ballistic trajectory preview.
- [x] Standard/heavy/pulse projectiles and radial pulse impulse.
- [x] Collision score combos, procedural audio and impact VFX.
- [x] Velocity-based settled-world detection.
- [x] Authored breakable columns and hinged spinner mechanisms.
- [x] Three-star results, retry and next-level flow.
- [x] Remove mode with limited block pulls and `removed` objectives.
- [x] Protect conditions with failure state and retry flow.
- [x] Local progression persistence, best score/stars and sequential unlock rules.
- [x] Adaptive mobile performance, safe-area/touch UI, vibration and reduced-motion behavior.
- [x] F3 developer physics/performance overlay.
- [x] Level editor: selected-entity highlight, asset/material/motion palette, transforms, create/duplicate/delete, full JSON editing, import/export and deterministic Preview/Restore.
- [x] Five progressive prototype levels and original prototype asset library.
- [x] GitHub Actions typecheck/build workflow.

## Next implementation block
1. Add Babylon transform gizmos with editor pause/isolation mode and sync back to JSON transforms.
2. Add tags/objective/inventory editors and level metadata forms.
3. Add broader authored level pack with progressive mechanics and world grouping.
4. Add production audio assets and adaptive mix snapshots.
5. Add user-facing accessibility/settings panel for camera motion, effects, vibration and input sensitivity.
6. Add optional WebGPU quality path and richer post-processing.
7. Add automated level/schema tests and physics smoke tests.
8. Add PWA/offline packaging and install metadata.

## Asset set
The prototype pack contains structural blocks, cylinder/wedge pieces, platforms, standard/heavy/pulse projectiles, goal core, target totem, bumper, spinner, arch and segmented column. Production art can replace visuals without changing canonical physics dimensions.
