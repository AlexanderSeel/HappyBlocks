import { Color3, PBRMaterial, Scene } from "@babylonjs/core";
import { getActiveEnvironment } from "../levels/LevelPresentation";
import { createProjectileMaterials } from "./ProjectileMaterialFactory";
import { applySceneEnvironment } from "./SceneEnvironment";
import { createTextureKits, type TextureKit } from "./TextureKitFactory";

export type MaterialLibrary = Record<string, PBRMaterial>;

function constrainedDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

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
  material.bumpTexture = kit.normal;
  material.bumpTexture.level = 0.75;
  material.metallicTexture = kit.orm;
  material.useAmbientOcclusionFromMetallicTextureRed = true;
  material.useRoughnessFromMetallicTextureGreen = true;
  material.useMetallnessFromMetallicTextureBlue = true;
  material.albedoColor = Color3.FromHexString(tint);
  material.metallic = metallic;
  material.roughness = roughness;
  material.environmentIntensity = 0.9;
  if (emissive && kit.emissive) {
    material.emissiveTexture = kit.emissive;
    material.emissiveColor = Color3.FromHexString(emissive);
    material.emissiveIntensity = 1.2;
  }
  return material;
}

export function createMaterialLibrary(scene: Scene): MaterialLibrary {
  applySceneEnvironment(scene, getActiveEnvironment(), constrainedDevice());
  const kits = createTextureKits(scene);
  const projectile = createProjectileMaterials(scene);
  return {
    wood: pbr(scene, "wood", kits.wood, "#ffffff", 1, 1),
    stone: pbr(scene, "stone", kits.stone, "#ffffff", 1, 1),
    metal: pbr(scene, "metal", kits.metal, "#e2edf0", 1, 1),
    rubber: pbr(scene, "rubber", kits.rubber, "#dbe8eb", 1, 1),
    ceramic: pbr(scene, "ceramic", kits.ceramic, "#ffffff", 1, 1),
    ceramic_cyan: pbr(scene, "ceramic_cyan", kits.ceramic, "#28c8e6", 1, 1),
    ceramic_amber: pbr(scene, "ceramic_amber", kits.ceramic, "#f2ad42", 1, 1),
    ceramic_violet: pbr(scene, "ceramic_violet", kits.ceramic, "#8c69e8", 1, 1),
    projectile_chrome: projectile.chrome,
    projectile_rubber: projectile.rubber,
    projectile_concrete: projectile.concrete,
    projectile_ceramic: projectile.ceramic,
    energy: pbr(scene, "energy", kits.energy, "#fff4b5", 1, 1, "#ffad2a"),
    platform: pbr(scene, "platform", kits.stone, "#17343d", 1, 1),
  };
}
