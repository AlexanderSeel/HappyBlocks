import { Scene, Texture } from "@babylonjs/core";

export type TextureKitId =
  | "wood"
  | "stone"
  | "metal"
  | "rubber"
  | "ceramic"
  | "energy";

export interface TextureKit {
  albedo: Texture;
  normal: Texture;
  orm: Texture;
  emissive?: Texture;
}

type TextureChannel = "basecolor" | "normal" | "orm" | "emissive";

const TEXTURE_ROOT = "/assets/textures/pbr";

function constrainedDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function profileRoot(): string {
  return constrainedDevice() ? `${TEXTURE_ROOT}/mobile` : TEXTURE_ROOT;
}

function textureUrl(id: TextureKitId, channel: TextureChannel): string {
  return `${profileRoot()}/${id}_${channel}.webp`;
}

function createFileTexture(
  scene: Scene,
  id: TextureKitId,
  channel: TextureChannel,
  gammaSpace: boolean,
): Texture {
  const url = textureUrl(id, channel);
  const texture = new Texture(
    url,
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
    undefined,
    (message, exception) => {
      console.error(`[HappyBlocks] Failed to load PBR texture ${url}`, message, exception);
    },
  );
  texture.name = `kit-${id}-${channel}`;
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = constrainedDevice() ? 4 : 8;
  texture.gammaSpace = gammaSpace;
  return texture;
}

function build(scene: Scene, id: TextureKitId): TextureKit {
  const kit: TextureKit = {
    albedo: createFileTexture(scene, id, "basecolor", true),
    normal: createFileTexture(scene, id, "normal", false),
    orm: createFileTexture(scene, id, "orm", false),
  };
  if (id === "energy") {
    kit.emissive = createFileTexture(scene, id, "emissive", true);
  }
  return kit;
}

export function createTextureKits(scene: Scene): Record<TextureKitId, TextureKit> {
  return {
    wood: build(scene, "wood"),
    stone: build(scene, "stone"),
    metal: build(scene, "metal"),
    rubber: build(scene, "rubber"),
    ceramic: build(scene, "ceramic"),
    energy: build(scene, "energy"),
  };
}
