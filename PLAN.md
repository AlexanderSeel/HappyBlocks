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
- [x] Babylon.js scene/camera/light foundation.
- [x] Havok Physics V2 initialization.
- [x] Data-driven level loader and JSON schema.
- [x] Canonical asset/collider registry and physics-backed entity factory.
- [x] glTF visual cache separated from primitive Havok proxies.
- [x] Square/round arena physics generated from level configuration.
- [x] Drag/release throw input and ballistic trajectory preview.
- [x] Standard/heavy/pulse projectiles and radial pulse impulse.
- [x] Material-specific friction/restitution and high-bounce bumpers.
- [x] Collision impulse score bonuses, combo windows, audio and VFX.
- [x] Velocity-based settled-world detection.
- [x] Authored breakable columns and hinged spinner mechanisms.
- [x] Three-star results, retry and next-level flow.
- [x] Remove mode with limited click/tap block pulls and `removed` objectives.
- [x] Protect conditions with failure state and retry flow.
- [x] Local progression persistence, best score/stars and sequential unlock rules.
- [x] Adaptive mobile/low-power hardware scaling, shadow budget and VFX density.
- [x] Safe-area/touch-size UI and optional vibration feedback.
- [x] Reduced-motion-aware visual effects.
- [x] F3 developer physics/performance overlay.
- [x] Five progressive prototype levels.
- [x] Original prototype model/UI/texture/effect asset library.
- [x] GitHub Actions typecheck/build workflow.

## Next implementation block
1. Add in-browser level editor with transform gizmos and JSON import/export.
2. Add broader authored level pack with progressive mechanics and world grouping.
3. Add production audio assets and adaptive mix snapshots.
4. Add user-facing accessibility/settings panel for camera motion, effects, vibration and input sensitivity.
5. Add optional WebGPU quality path and richer post-processing.
6. Add automated level/schema tests and physics smoke tests.
7. Add PWA/offline packaging and install metadata.

## Asset set
The prototype pack contains structural blocks, cylinder/wedge pieces, platforms, standard/heavy/pulse projectiles, goal core, target totem, bumper, spinner, arch and segmented column. Production art can replace visuals without changing canonical physics dimensions.
