export interface PhysicsSurface {
  friction: number;
  restitution: number;
}

export function getPhysicsSurface(
  assetId: string,
  materialId = "wood",
): PhysicsSurface {
  if (assetId === "bumper.round") {
    return { friction: 0.12, restitution: 0.92 };
  }

  switch (materialId) {
    case "rubber":
      return { friction: 0.72, restitution: 0.68 };
    case "metal":
      return { friction: 0.32, restitution: 0.16 };
    case "stone":
      return { friction: 0.7, restitution: 0.035 };
    case "ceramic":
    case "ceramic_cyan":
    case "ceramic_amber":
    case "ceramic_violet":
      return { friction: 0.48, restitution: 0.12 };
    case "energy":
      return { friction: 0.22, restitution: 0.3 };
    default:
      return { friction: 0.58, restitution: 0.08 };
  }
}
