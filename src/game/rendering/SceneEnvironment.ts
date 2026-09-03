import {
  Color3,
  EquiRectangularCubeTexture,
  Matrix,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
} from "@babylonjs/core";
import type { LevelEnvironment } from "../levels/types";

export const SKYBOX_IDS = [
  "clear_lab",
  "sunset_foundry",
  "aurora_night",
  "deep_space",
  "stormfront",
  "neon_twilight",
] as const;

export type SkyboxId = (typeof SKYBOX_IDS)[number];

const DEFAULT_SKYBOX: SkyboxId = "clear_lab";

export function applySceneEnvironment(
  scene: Scene,
  environment: LevelEnvironment | undefined,
  lowPower: boolean,
): void {
  const skybox = SKYBOX_IDS.includes(environment?.skybox as SkyboxId)
    ? (environment!.skybox as SkyboxId)
    : DEFAULT_SKYBOX;
  const url = `/assets/skyboxes/${skybox}.webp`;
  const texture = new EquiRectangularCubeTexture(url, scene, lowPower ? 512 : 1024);
  texture.name = `environment-${skybox}`;
  texture.coordinatesMode = Texture.SKYBOX_MODE;
  texture.setReflectionTextureMatrix(Matrix.RotationY(environment?.rotationY ?? 0));
  texture.level = 1.05;

  scene.environmentTexture = texture;
  scene.environmentIntensity = environment?.intensity ?? 1;

  const sky = MeshBuilder.CreateBox("level-skybox", { size: 320 }, scene);
  sky.infiniteDistance = true;
  sky.isPickable = false;

  const material = new StandardMaterial("level-skybox-material", scene);
  material.backFaceCulling = false;
  material.disableLighting = true;
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.reflectionTexture = texture;
  sky.material = material;
}
