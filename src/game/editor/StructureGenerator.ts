import type { LevelEntity, Vec3Tuple } from "../levels/types";

export type StructureTemplate =
  | "watchtower"
  | "gatehouse"
  | "bridge-span"
  | "rampart"
  | "ricochet-station";

export interface StructureGeneratorOptions {
  template: StructureTemplate;
  anchor: Vec3Tuple;
  prefix: string;
}

export function generateStructure(
  options: StructureGeneratorOptions,
): LevelEntity[] {
  const entities: LevelEntity[] = [];
  let counter = 0;
  const [ax, ay, az] = options.anchor;

  const add = (
    asset: string,
    material: string,
    offset: Vec3Tuple,
    rotation: Vec3Tuple = [0, 0, 0],
    tags: string[] = ["structure"],
    motion: "STATIC" | "DYNAMIC" = "DYNAMIC",
    extra: Partial<LevelEntity> = {},
  ): void => {
    entities.push({
      id: `${options.prefix}-${++counter}`,
      asset,
      material,
      position: [ax + offset[0], ay + offset[1], az + offset[2]],
      rotation,
      scale: [1, 1, 1],
      motion,
      tags,
      ...extra,
    });
  };

  if (options.template === "watchtower") {
    for (const x of [-0.85, 0.85]) {
      for (const z of [-0.7, 0.7]) {
        add("block.pillar", "stone", [x, 1.05, z], [0, 0, 0], ["structure", "tower"]);
      }
    }
    add("block.slab", "metal", [0, 2.25, 0], [0, 0, 0], ["structure", "tower"]);
    for (const [x, z] of [[-0.78,-0.62],[0.78,-0.62],[-0.78,0.62],[0.78,0.62]] as Array<[number,number]>) {
      add("block.cube", "ceramic_cyan", [x, 2.88, z], [0, 0, 0], ["structure", "tower"]);
    }
    add("block.plank", "wood", [0, 3.48, -0.62], [0, 0, 0], ["structure", "tower"]);
    add("block.plank", "wood", [0, 3.48, 0.62], [0, 0, 0], ["structure", "tower"]);
    add("block.plank", "wood", [-0.78, 3.48, 0], [0, Math.PI / 2, 0], ["structure", "tower"]);
    add("block.plank", "wood", [0.78, 3.48, 0], [0, Math.PI / 2, 0], ["structure", "tower"]);
    add("block.wedge", "metal", [0, 3.92, 0], [0, Math.PI / 2, 0], ["structure", "tower", "roof"]);
  } else if (options.template === "gatehouse") {
    for (const x of [-1.45, 1.45]) {
      add("block.pillar", "stone", [x, 1.05, 0], [0, 0, 0], ["structure", "gate"]);
      add("block.cube", "stone", [x, 2.55, 0], [0, 0, 0], ["structure", "gate"]);
      add("block.cube", "ceramic_amber", [x, 3.55, 0], [0, 0, 0], ["structure", "gate"]);
    }
    add("block.plank", "metal", [0, 3.0, 0], [0, 0, 0], ["structure", "gate"]);
    add("block.plank", "wood", [0, 4.1, 0], [0, 0, 0], ["structure", "gate"]);
    add("breakable.column", "ceramic_cyan", [0, 1.2, 0], [0, 0, 0], ["structure", "gate", "breakable"], "DYNAMIC", { breakThreshold: 4.2 });
    add("spinner.cross", "metal", [0, 2.2, -0.72], [0, 0, 0], ["structure", "mechanism"]);
    for (const x of [-2.35, 2.35]) {
      add("block.pillar", "stone", [x, 1.05, 0], [0, 0, 0], ["structure", "wall"]);
      add("block.plank", "wood", [x, 2.2, 0], [0, Math.PI / 2, 0], ["structure", "wall"]);
    }
  } else if (options.template === "bridge-span") {
    for (const x of [-2.25, 0, 2.25]) {
      add("block.pillar", "stone", [x, 1.05, -0.65], [0, 0, 0], ["structure", "bridge"]);
      add("block.pillar", "stone", [x, 1.05, 0.65], [0, 0, 0], ["structure", "bridge"]);
    }
    for (const x of [-1.12, 1.12]) {
      add("block.slab", "metal", [x, 2.18, 0], [0, 0, 0], ["structure", "bridge"]);
      add("block.rod", "ceramic_cyan", [x, 2.85, -0.72], [0, 0, Math.PI / 3.8], ["structure", "bridge", "truss"]);
      add("block.rod", "ceramic_amber", [x, 2.85, 0.72], [0, 0, -Math.PI / 3.8], ["structure", "bridge", "truss"]);
    }
    add("block.plank", "wood", [0, 3.35, -0.72], [0, 0, 0], ["structure", "bridge"]);
    add("block.plank", "wood", [0, 3.35, 0.72], [0, 0, 0], ["structure", "bridge"]);
  } else if (options.template === "rampart") {
    for (let x = -3; x <= 3; x += 1.5) {
      add("block.pillar", "stone", [x, 1.05, 0], [0, 0, 0], ["structure", "wall"]);
      add("block.cube", x % 3 === 0 ? "ceramic_amber" : "ceramic_cyan", [x, 2.55, 0], [0, 0, 0], ["structure", "battlement"]);
    }
    for (const x of [-2.25, -0.75, 0.75, 2.25]) {
      add("block.plank", "wood", [x, 2.2, 0], [0, 0, 0], ["structure", "wall"]);
    }
    add("block.wedge", "metal", [-3.65, 0.5, 0], [0, Math.PI / 2, 0], ["structure", "ramp"]);
    add("block.wedge", "metal", [3.65, 0.5, 0], [0, -Math.PI / 2, 0], ["structure", "ramp"]);
  } else {
    add("block.wedge", "metal", [-1.6, 0.5, 0], [0, Math.PI / 2, 0], ["structure", "ramp"], "STATIC");
    add("block.wedge", "metal", [1.6, 0.5, 0], [0, -Math.PI / 2, 0], ["structure", "ramp"], "STATIC");
    add("bumper.round", "rubber", [0, 0.22, 0], [0, 0, 0], ["structure", "bumper"], "STATIC");
    add("bumper.round", "rubber", [-2.8, 0.22, 1.6], [0, 0, 0], ["structure", "bumper"], "STATIC");
    add("bumper.round", "rubber", [2.8, 0.22, 1.6], [0, 0, 0], ["structure", "bumper"], "STATIC");
    add("spinner.cross", "metal", [0, 1.35, 2.3], [0, 0, 0], ["structure", "mechanism"]);
    add("block.pillar", "stone", [-0.9, 1.05, 3.5], [0, 0, 0], ["structure", "goal-frame"]);
    add("block.pillar", "stone", [0.9, 1.05, 3.5], [0, 0, 0], ["structure", "goal-frame"]);
    add("block.plank", "wood", [0, 2.2, 3.5], [0, 0, 0], ["structure", "goal-frame"]);
  }

  return entities;
}
