import { Color3, PBRMaterial, Scene } from "@babylonjs/core";
import { createTextureKits, type TextureKit } from "./TextureKitFactory";

export type MaterialLibrary = Record<string, PBRMaterial>;

function pbr(
  scene: Scene,
  name: string,
  kit: TextureKit,
  tint: string,
  metallic: number,
  roughness: number,
  emissive?: string,
): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoTexture = kit.albedo;
  material.albedoColor = Color3.FromHexString(tint);
  material.metallic = metallic;
  material.roughness = roughness;
  material.environmentIntensity = 0.8;
  if (emissive) {
    material.emissiveTexture = kit.albedo;
    material.emissiveColor = Color3.FromHexString(emissive);
  }
  return material;
}

export function createMaterialLibrary(scene: Scene): MaterialLibrary {
  const kits = createTextureKits(scene);
  return {
    wood: pbr(scene, "wood", kits.wood, "#ffffff", 0.02, 0.56),
    stone: pbr(scene, "stone", kits.stone, "#ffffff", 0.03, 0.8),
    metal: pbr(scene, "metal", kits.metal, "#e2edf0", 0.86, 0.27),
    rubber: pbr(scene, "rubber", kits.rubber, "#dbe8eb", 0.03, 0.73),
    ceramic: pbr(scene, "ceramic", kits.ceramic, "#ffffff", 0.04, 0.28),
    ceramic_cyan: pbr(scene, "ceramic_cyan", kits.ceramic, "#28c8e6", 0.05, 0.26),
    ceramic_amber: pbr(scene, "ceramic_amber", kits.ceramic, "#f2ad42", 0.05, 0.27),
    ceramic_violet: pbr(scene, "ceramic_violet", kits.ceramic, "#8c69e8", 0.05, 0.27),
    projectile: pbr(scene, "projectile", kits.metal, "#effcff", 0.48, 0.16, "#0b3541"),
    energy: pbr(scene, "energy", kits.energy, "#fff4b5", 0.12, 0.16, "#ffad2a"),
    platform: pbr(scene, "platform", kits.metal, "#17343d", 0.58, 0.39),
  };
}
