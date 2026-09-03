import { PhysicsShapeType } from "@babylonjs/core";

export interface AssetDefinition {
  kind: "box" | "sphere" | "cylinder" | "capsule" | "wedge" | "compound";
  dimensions: [number, number, number];
  radius?: number;
  physicsShape: PhysicsShapeType;
  mass: number;
  model: string;
}

export const ASSETS: Record<string, AssetDefinition> = {
  "block.cube": { kind: "box", dimensions: [1, 1, 1], physicsShape: PhysicsShapeType.BOX, mass: 1.3, model: "/assets/models/block_cube.gltf" },
  "block.long": { kind: "box", dimensions: [2, 1, 1], physicsShape: PhysicsShapeType.BOX, mass: 2.1, model: "/assets/models/block_long.gltf" },
  "block.plank": { kind: "box", dimensions: [3, 0.36, 0.72], physicsShape: PhysicsShapeType.BOX, mass: 1.5, model: "/assets/models/block_plank.gltf" },
  "block.pillar": { kind: "box", dimensions: [0.8, 2.1, 0.8], physicsShape: PhysicsShapeType.BOX, mass: 3.3, model: "/assets/models/block_pillar.gltf" },
  "block.slab": { kind: "box", dimensions: [2.5, 0.35, 1.5], physicsShape: PhysicsShapeType.BOX, mass: 3, model: "/assets/models/block_slab.gltf" },
  "block.rod": { kind: "box", dimensions: [0.35, 2.7, 0.35], physicsShape: PhysicsShapeType.BOX, mass: 1.2, model: "/assets/models/block_rod.gltf" },
  "block.cylinder": { kind: "cylinder", dimensions: [1, 1, 1], radius: 0.5, physicsShape: PhysicsShapeType.CYLINDER, mass: 1.4, model: "/assets/models/block_cylinder.gltf" },
  "goal.energyCore": { kind: "sphere", dimensions: [0.9, 0.9, 0.9], radius: 0.45, physicsShape: PhysicsShapeType.SPHERE, mass: 1, model: "/assets/models/goal_energy_core.gltf" },
  "target.totem": { kind: "cylinder", dimensions: [0.75, 1.4, 0.75], radius: 0.375, physicsShape: PhysicsShapeType.CYLINDER, mass: 1.4, model: "/assets/models/target_totem.gltf" },
  "breakable.column": { kind: "box", dimensions: [0.8, 2.4, 0.8], physicsShape: PhysicsShapeType.BOX, mass: 3, model: "/assets/models/breakable_column.gltf" },
  "spinner.cross": { kind: "box", dimensions: [2.8, 0.3, 0.55], physicsShape: PhysicsShapeType.BOX, mass: 2, model: "/assets/models/spinner_cross.gltf" },
  "projectile.ball": { kind: "sphere", dimensions: [0.76, 0.76, 0.76], radius: 0.38, physicsShape: PhysicsShapeType.SPHERE, mass: 1.8, model: "/assets/models/projectile_ball.gltf" },
  "projectile.heavy": { kind: "sphere", dimensions: [1.04, 1.04, 1.04], radius: 0.52, physicsShape: PhysicsShapeType.SPHERE, mass: 4.6, model: "/assets/models/projectile_heavy_ball.gltf" },
  "projectile.pulse": { kind: "capsule", dimensions: [0.56, 1.32, 0.56], radius: 0.28, physicsShape: PhysicsShapeType.CAPSULE, mass: 1.35, model: "/assets/models/projectile_pulse_capsule.gltf" },
};
