import type { HappyBlocksLevel, LevelEnvironment, ProjectileSurface } from "./types";

const DEFAULT_PROJECTILE_SURFACES: Record<string, ProjectileSurface> = {
  "projectile.ball": "chrome",
  "projectile.heavy": "concrete",
  "projectile.pulse": "ceramic",
};

let environment: LevelEnvironment | undefined;
let projectileSkins: Record<string, ProjectileSurface> = {
  ...DEFAULT_PROJECTILE_SURFACES,
};

export function setActiveLevelPresentation(level: HappyBlocksLevel): void {
  environment = level.environment ? { ...level.environment } : undefined;
  projectileSkins = {
    ...DEFAULT_PROJECTILE_SURFACES,
    ...(level.projectileSkins ?? {}),
  };
}

export function getActiveEnvironment(): LevelEnvironment | undefined {
  return environment ? { ...environment } : undefined;
}

export function getActiveProjectileSurface(assetId: string): ProjectileSurface {
  return projectileSkins[assetId] ?? DEFAULT_PROJECTILE_SURFACES[assetId] ?? "chrome";
}
