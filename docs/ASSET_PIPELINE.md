# HappyBlocks asset pipeline

The 3D objects are original low-poly, self-contained glTF files with embedded buffers. 1 Babylon unit = 1 meter and +Y is up.

Visual geometry and physics geometry are intentionally separate. Basic blocks use BOX proxies, balls SPHERE, round blocks CYLINDER and complex devices compound/convex proxies. Do not switch to triangle-mesh colliders merely because production art becomes more detailed.

## High-definition texture kits

HappyBlocks does not use SVG art for the production surface look. `src/game/rendering/TextureKitFactory.ts` builds repeatable raster texture kits directly into Babylon `DynamicTexture` surfaces. Desktop uses 2048×2048 surface textures; constrained/touch devices use 1024×1024 to protect fill-rate and memory.

Current kits:
- wood — layered grain, tonal variation and knots
- stone — mineral grain, pores and fracture lines
- metal — directional brushed-metal microstructure
- rubber — dark micro-grain and soft surface breakup
- ceramic — glazed neutral surface designed for runtime cyan/amber/violet tinting
- energy — luminous technical grid/ring pattern for goals and pulse devices

The kits feed `PBRMaterial` instances, while metallic/roughness values remain material-specific and can later be extended with packed ORM and dedicated normal maps without changing level data.

The legacy SVG placeholder icon directory has been removed. HUD/editor controls are HTML/CSS and the game surface art is raster/procedural plus glTF.

`public/assets/asset-manifest.json` is the canonical model inventory. `src/game/AssetDefinitions.ts` contains dimensions/masses used by the runtime. Production meshes can replace current glTF visuals without changing canonical gameplay dimensions or Havok proxies.
