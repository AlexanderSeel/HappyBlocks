import {
  AbstractMesh,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { ASSETS } from "../AssetDefinitions";
import { createWedgeMesh } from "./WedgeMesh";

export interface DetailedVisual {
  meshes: AbstractMesh[];
  dispose: () => void;
}

function finish(
  scene: Scene,
  parts: Mesh[],
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  if (parts.length === 0) return null;
  for (const part of parts) {
    part.material = material;
    part.isPickable = true;
    part.receiveShadows = true;
  }
  const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  if (!merged) return null;
  merged.name = `${instanceName}:detail`;
  merged.parent = parent;
  merged.material = material;
  merged.isPickable = true;
  merged.receiveShadows = true;
  merged.metadata = {
    happyBlocksEntityId: instanceName,
    happyBlocksEditorId: instanceName,
  };
  return { meshes: [merged], dispose: () => merged.dispose() };
}

function bolt(
  scene: Scene,
  name: string,
  radius: number,
  position: Vector3,
): Mesh {
  const mesh = MeshBuilder.CreateCylinder(
    name,
    { diameter: radius * 2, height: radius * 0.55, tessellation: 12 },
    scene,
  );
  mesh.position.copyFrom(position);
  return mesh;
}

function detailedBox(
  scene: Scene,
  assetId: string,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const definition = ASSETS[assetId];
  const [w, h, d] = definition.dimensions;
  const minDimension = Math.min(w, h, d);
  const parts: Mesh[] = [
    MeshBuilder.CreateBox(
      `${instanceName}:body`,
      { width: w * 0.96, height: h * 0.96, depth: d * 0.96 },
      scene,
    ),
  ];

  const plateDepth = Math.max(0.016, minDimension * 0.025);
  const plateW = Math.max(0.08, w * 0.68);
  const plateD = Math.max(0.08, d * 0.68);
  for (const y of [-h * 0.492, h * 0.492]) {
    const plate = MeshBuilder.CreateBox(
      `${instanceName}:plate`,
      { width: plateW, height: plateDepth, depth: plateD },
      scene,
    );
    plate.position.y = y;
    parts.push(plate);
  }

  const rail = Math.max(0.025, minDimension * 0.055);
  for (const y of [-h * 0.485, h * 0.485]) {
    for (const z of [-d * 0.43, d * 0.43]) {
      const piece = MeshBuilder.CreateBox(
        `${instanceName}:rail-x`,
        { width: w * 0.84, height: rail, depth: rail },
        scene,
      );
      piece.position.copyFromFloats(0, y, z);
      parts.push(piece);
    }
    for (const x of [-w * 0.43, w * 0.43]) {
      const piece = MeshBuilder.CreateBox(
        `${instanceName}:rail-z`,
        { width: rail, height: rail, depth: d * 0.84 },
        scene,
      );
      piece.position.copyFromFloats(x, y, 0);
      parts.push(piece);
    }
  }

  const boltRadius = Math.max(0.022, minDimension * 0.045);
  for (const y of [-h * 0.505, h * 0.505]) {
    for (const x of [-w * 0.32, w * 0.32]) {
      for (const z of [-d * 0.32, d * 0.32]) {
        const fastener = bolt(
          scene,
          `${instanceName}:bolt`,
          boltRadius,
          new Vector3(x, y, z),
        );
        if (y < 0) fastener.rotation.z = Math.PI;
        parts.push(fastener);
      }
    }
  }

  if (
    assetId === "breakable.column" ||
    assetId === "block.pillar" ||
    assetId === "block.rod"
  ) {
    const bandYs =
      assetId === "breakable.column" ? [-h * 0.28, 0, h * 0.28] : [-h * 0.3, h * 0.3];
    for (const y of bandYs) {
      const band = MeshBuilder.CreateBox(
        `${instanceName}:band`,
        {
          width: w * 1.055,
          height: Math.max(0.04, h * 0.028),
          depth: d * 1.055,
        },
        scene,
      );
      band.position.y = y;
      parts.push(band);
    }
  }

  return finish(scene, parts, parent, material, instanceName);
}

function detailedWedge(
  scene: Scene,
  assetId: string,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const definition = ASSETS[assetId];
  const [w, h, d] = definition.dimensions;
  const parts: Mesh[] = [
    createWedgeMesh(
      `${instanceName}:body`,
      [w * 0.96, h * 0.96, d * 0.96],
      scene,
    ),
  ];

  const slopeAngle = Math.atan2(h, d);
  const railThickness = Math.max(0.028, Math.min(w, h, d) * 0.055);
  for (const z of [-d * 0.28, d * 0.22]) {
    const y = -(z * h) / d;
    const rail = MeshBuilder.CreateBox(
      `${instanceName}:slope-rail`,
      {
        width: w * 0.82,
        height: railThickness,
        depth: railThickness * 1.35,
      },
      scene,
    );
    rail.position.copyFromFloats(0, y + railThickness * 0.35, z);
    rail.rotation.x = slopeAngle;
    parts.push(rail);
  }

  for (const x of [-w * 0.47, w * 0.47]) {
    const cheek = createWedgeMesh(
      `${instanceName}:side-cheek`,
      [Math.max(0.035, w * 0.055), h * 0.9, d * 0.9],
      scene,
    );
    cheek.position.x = x;
    parts.push(cheek);
  }

  const frontGuard = MeshBuilder.CreateBox(
    `${instanceName}:front-guard`,
    {
      width: w * 0.88,
      height: Math.max(0.05, h * 0.075),
      depth: Math.max(0.04, d * 0.055),
    },
    scene,
  );
  frontGuard.position.copyFromFloats(0, -h * 0.45, d * 0.47);
  parts.push(frontGuard);

  return finish(scene, parts, parent, material, instanceName);
}

function detailedCylinder(
  scene: Scene,
  assetId: string,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const definition = ASSETS[assetId];
  const radius = definition.radius ?? definition.dimensions[0] / 2;
  const h = definition.dimensions[1];
  const parts: Mesh[] = [
    MeshBuilder.CreateCylinder(
      `${instanceName}:body`,
      { diameter: radius * 1.92, height: h * 0.96, tessellation: 36 },
      scene,
    ),
  ];

  for (const y of [-h * 0.49, h * 0.49]) {
    const ring = MeshBuilder.CreateTorus(
      `${instanceName}:ring`,
      {
        diameter: radius * 1.62,
        thickness: Math.max(0.035, radius * 0.11),
        tessellation: 36,
      },
      scene,
    );
    ring.position.y = y;
    parts.push(ring);
  }

  if (assetId === "bumper.round") {
    const outer = MeshBuilder.CreateTorus(
      `${instanceName}:rubber-ring`,
      { diameter: radius * 1.55, thickness: radius * 0.24, tessellation: 42 },
      scene,
    );
    outer.position.y = h * 0.46;
    parts.push(outer);
    parts.push(
      MeshBuilder.CreateCylinder(
        `${instanceName}:hub`,
        { diameter: radius * 0.42, height: h * 1.15, tessellation: 28 },
        scene,
      ),
    );
  }

  if (assetId === "target.totem") {
    const crown = MeshBuilder.CreateSphere(
      `${instanceName}:crown`,
      { diameter: radius * 1.05, segments: 24 },
      scene,
    );
    crown.position.y = h * 0.56;
    parts.push(crown);
    const halo = MeshBuilder.CreateTorus(
      `${instanceName}:halo`,
      { diameter: radius * 1.5, thickness: radius * 0.1, tessellation: 32 },
      scene,
    );
    halo.position.y = h * 0.56;
    halo.rotation.x = Math.PI / 2;
    parts.push(halo);
  }

  return finish(scene, parts, parent, material, instanceName);
}

function detailedSphere(
  scene: Scene,
  assetId: string,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const radius = ASSETS[assetId].radius ?? 0.4;
  const parts: Mesh[] = [
    MeshBuilder.CreateSphere(
      `${instanceName}:body`,
      { diameter: radius * 1.92, segments: 32 },
      scene,
    ),
  ];
  const ringCount = assetId === "goal.energyCore" ? 3 : 2;
  for (let index = 0; index < ringCount; index += 1) {
    const ring = MeshBuilder.CreateTorus(
      `${instanceName}:ring-${index}`,
      {
        diameter: radius * (assetId === "goal.energyCore" ? 2.1 : 1.62),
        thickness: Math.max(0.022, radius * 0.07),
        tessellation: 42,
      },
      scene,
    );
    if (index === 1) ring.rotation.x = Math.PI / 2;
    if (index === 2) ring.rotation.z = Math.PI / 2;
    parts.push(ring);
  }

  if (assetId === "projectile.heavy") {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const stud = MeshBuilder.CreateSphere(
        `${instanceName}:stud`,
        { diameter: radius * 0.13, segments: 10 },
        scene,
      );
      stud.position.copyFromFloats(
        Math.cos(angle) * radius * 0.72,
        0,
        Math.sin(angle) * radius * 0.72,
      );
      parts.push(stud);
    }
  }

  return finish(scene, parts, parent, material, instanceName);
}

function detailedCapsule(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const definition = ASSETS["projectile.pulse"];
  const radius = definition.radius ?? 0.28;
  const h = definition.dimensions[1];
  const parts: Mesh[] = [
    MeshBuilder.CreateCapsule(
      `${instanceName}:body`,
      { radius: radius * 0.95, height: h * 0.96, tessellation: 24, subdivisions: 4 },
      scene,
    ),
  ];
  for (const y of [-h * 0.18, h * 0.18]) {
    const ring = MeshBuilder.CreateTorus(
      `${instanceName}:ring`,
      { diameter: radius * 1.65, thickness: radius * 0.1, tessellation: 30 },
      scene,
    );
    ring.position.y = y;
    parts.push(ring);
  }
  return finish(scene, parts, parent, material, instanceName);
}

function detailedSpinner(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const parts: Mesh[] = [
    MeshBuilder.CreateBox(
      `${instanceName}:bar-a`,
      { width: 2.75, height: 0.25, depth: 0.48 },
      scene,
    ),
    MeshBuilder.CreateBox(
      `${instanceName}:bar-b`,
      { width: 0.48, height: 0.25, depth: 2.75 },
      scene,
    ),
    MeshBuilder.CreateCylinder(
      `${instanceName}:hub`,
      { diameter: 0.68, height: 0.42, tessellation: 32 },
      scene,
    ),
  ];
  const ring = MeshBuilder.CreateTorus(
    `${instanceName}:hub-ring`,
    { diameter: 0.78, thickness: 0.08, tessellation: 32 },
    scene,
  );
  ring.position.y = 0.22;
  parts.push(ring);
  return finish(scene, parts, parent, material, instanceName);
}

export function createDetailedVisual(
  scene: Scene,
  assetId: string,
  parent: TransformNode,
  material: Material,
  instanceName: string,
): DetailedVisual | null {
  const definition = ASSETS[assetId];
  if (!definition || assetId.startsWith("platform.")) return null;
  if (assetId === "spinner.cross") {
    return detailedSpinner(scene, parent, material, instanceName);
  }
  if (definition.kind === "wedge") {
    return detailedWedge(scene, assetId, parent, material, instanceName);
  }
  if (definition.kind === "sphere") {
    return detailedSphere(scene, assetId, parent, material, instanceName);
  }
  if (definition.kind === "capsule") {
    return detailedCapsule(scene, parent, material, instanceName);
  }
  if (definition.kind === "cylinder") {
    return detailedCylinder(scene, assetId, parent, material, instanceName);
  }
  return detailedBox(scene, assetId, parent, material, instanceName);
}
