# HappyBlocks asset pipeline

The current 3D objects are original low-poly, self-contained glTF files with embedded buffers. 1 Babylon unit = 1 meter and +Y is up.

Visual geometry and physics geometry are intentionally separate. Basic blocks use BOX proxies, balls SPHERE, round blocks CYLINDER and complex devices compound/convex proxies. Do not switch to triangle-mesh colliders merely because production art becomes more detailed.

`public/assets/asset-manifest.json` is the canonical inventory. `src/game/AssetDefinitions.ts` contains dimensions/masses used by the current runtime. Special devices can receive production art later without changing those canonical gameplay dimensions.
