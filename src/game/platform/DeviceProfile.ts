import { Engine } from "@babylonjs/core";

export interface DeviceProfile {
  coarsePointer: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
  hardwareScalingLevel: number;
  shadowMapSize: number;
  effectScale: number;
}

export function detectDeviceProfile(): DeviceProfile {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const cores = navigator.hardwareConcurrency || 8;
  const lowPower = cores <= 4 || (coarsePointer && window.innerWidth <= 900);

  return {
    coarsePointer,
    lowPower,
    reducedMotion,
    hardwareScalingLevel: lowPower ? 1.5 : coarsePointer ? 1.25 : 1,
    shadowMapSize: lowPower ? 1024 : coarsePointer ? 1536 : 2048,
    effectScale: reducedMotion ? 0.32 : lowPower ? 0.55 : coarsePointer ? 0.75 : 1,
  };
}

export function applyDeviceProfile(
  engine: Engine,
  profile: DeviceProfile,
): void {
  engine.setHardwareScalingLevel(profile.hardwareScalingLevel);
  document.documentElement.dataset.input = profile.coarsePointer ? "touch" : "pointer";
  document.documentElement.dataset.performance = profile.lowPower ? "low" : "full";
  document.documentElement.dataset.motion = profile.reducedMotion ? "reduced" : "full";
}
