import { Color3, PBRMaterial, Scene, Texture } from "@babylonjs/core";

export const PROJECTILE_SURFACE_IDS = [
  "chrome",
  "rubber",
  "concrete",
  "ceramic",
] as const;

export type ProjectileSurfaceId = (typeof PROJECTILE_SURFACE_IDS)[number];

interface SurfaceTuning {
  tint: string;
  metallic: number;
  roughness: number;
  environmentIntensity: number;
  bumpLevel: number;
}

const TUNING: Record<ProjectileSurfaceId, SurfaceTuning> = {
  chrome: {
    tint: "#f3fbff",
    metallic: 1,
    roughness: 0.1,
    environmentIntensity: 1.55,
    bumpLevel: 0.35,
  },
  rubber: {
    tint: "#d9e2e4",
    metallic: 0,
    roughness: 0.9,
    environmentIntensity: 0.65,
    bumpLevel: 1.05,
  },
  concrete: {
    tint: "#eef0ef",
    metallic: 0,
    roughness: 0.96,
    environmentIntensity: 0.72,
    bumpLevel: 1.15,
  },
  ceramic: {
    tint: "#ffffff",
    metallic: 0,
    roughness: 0.16,
    environmentIntensity: 1.1,
    bumpLevel: 0.45,
  },
};

function constrainedDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function root(): string {
  return constrainedDevice()
    ? "/assets/textures/projectiles/mobile"
    : "/assets/textures/projectiles";
}

function fileTexture(
  scene: Scene,
  surface: ProjectileSurfaceId,
  channel: "basecolor" | "normal" | "orm",
  gammaSpace: boolean,
): Texture {
  const url = `${root()}/${surface}_${channel}.webp`;
  const texture = new Texture(
    url,
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.name = `projectile-${surface}-${channel}`;
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = constrainedDevice() ? 4 : 8;
  texture.gammaSpace = gammaSpace;
  return texture;
}

export function createProjectileMaterials(scene: Scene): Record<ProjectileSurfaceId, PBRMaterial> {
  return Object.fromEntries(
    PROJECTILE_SURFACE_IDS.map((surface) => {
      const tuning = TUNING[surface];
      const material = new PBRMaterial(`projectile-${surface}`, scene);
      material.albedoTexture = fileTexture(scene, surface, "basecolor", true);
      material.bumpTexture = fileTexture(scene, surface, "normal", false);
      material.bumpTexture.level = tuning.bumpLevel;
      material.metallicTexture = fileTexture(scene, surface, "orm", false);
      material.useAmbientOcclusionFromMetallicTextureRed = true;
      material.useRoughnessFromMetallicTextureGreen = true;
      material.useMetallnessFromMetallicTextureBlue = true;
      material.albedoColor = Color3.FromHexString(tuning.tint);
      material.metallic = tuning.metallic;
      material.roughness = tuning.roughness;
      material.environmentIntensity = tuning.environmentIntensity;
      return [surface, material];
    }),
  ) as Record<ProjectileSurfaceId, PBRMaterial>;
}
