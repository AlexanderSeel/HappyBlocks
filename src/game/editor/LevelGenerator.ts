import type { HappyBlocksLevel, LevelEntity } from "../levels/types";

export type GeneratorTemplate =
  | "tower"
  | "bridge"
  | "domino"
  | "fortress"
  | "chaos";

export interface LevelGeneratorOptions {
  template: GeneratorTemplate;
  seed: string;
  complexity: number;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLevel(
  source: HappyBlocksLevel,
  options: LevelGeneratorOptions,
): HappyBlocksLevel {
  const complexity = Math.max(1, Math.min(8, Math.round(options.complexity)));
  const random = mulberry32(hashSeed(options.seed || "happyblocks"));
  const entities: LevelEntity[] = [];
  let counter = 0;

  const add = (
    asset: string,
    material: string,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
    tags: string[] = [],
    motion: "STATIC" | "DYNAMIC" = "DYNAMIC",
  ): LevelEntity => {
    const entity: LevelEntity = {
      id: `generated-${++counter}`,
      asset,
      material,
      position,
      rotation,
      scale: [1, 1, 1],
      motion,
      tags,
    };
    entities.push(entity);
    return entity;
  };

  const addTarget = (position: [number, number, number]): void => {
    add("target.totem", "ceramic_violet", position, [0, 0, 0], ["target"]);
  };

  if (options.template === "tower") {
    const layers = 2 + complexity;
    for (let layer = 0; layer < layers; layer += 1) {
      const y = 0.5 + layer * 1.05;
      const width = Math.max(0.7, 1.45 - layer * 0.08);
      add("block.cube", layer % 2 ? "stone" : "wood", [-width, y, 0]);
      add("block.cube", layer % 2 ? "stone" : "wood", [width, y, 0]);
      add("block.plank", "wood", [0, y + 0.58, 0], [0, layer % 2 ? 0.08 : -0.08, 0]);
    }
    addTarget([0, layers * 1.05 + 0.75, 0]);
  } else if (options.template === "bridge") {
    const spans = 2 + complexity;
    const startX = -((spans - 1) * 1.25) / 2;
    for (let index = 0; index < spans; index += 1) {
      const x = startX + index * 1.25;
      add("block.pillar", "stone", [x, 1.05, 0]);
      if (index < spans - 1) {
        add("block.plank", "wood", [x + 0.625, 2.18, 0], [0, 0, 0]);
      }
    }
    const center = startX + ((spans - 1) * 1.25) / 2;
    addTarget([center, 0.7, 0.25]);
    if (complexity >= 4) {
      add("spinner.cross", "metal", [center, 1.35, -1.15], [0, 0, 0], ["mechanism"]);
    }
  } else if (options.template === "domino") {
    const count = 7 + complexity * 3;
    for (let index = 0; index < count; index += 1) {
      const t = index / Math.max(1, count - 1);
      const x = -3.8 + t * 7.1;
      const z = Math.sin(t * Math.PI * 1.35) * 1.45;
      add(
        "block.rod",
        index % 3 === 0 ? "ceramic_cyan" : "wood",
        [x, 1.35, z],
        [0, -0.25 + t * 0.5, 0],
      );
    }
    addTarget([3.8, 0.7, Math.sin(Math.PI * 1.35) * 1.45]);
  } else if (options.template === "fortress") {
    const half = 1.55 + complexity * 0.16;
    const towerHeight = 2 + Math.ceil(complexity / 2);
    const corners: Array<[number, number]> = [
      [-half, -half],
      [half, -half],
      [-half, half],
      [half, half],
    ];
    for (const [x, z] of corners) {
      for (let layer = 0; layer < towerHeight; layer += 1) {
        add("block.cube", layer % 2 ? "stone" : "ceramic_amber", [x, 0.5 + layer, z]);
      }
    }
    add("block.plank", "wood", [0, 1.25, -half], [0, 0, 0]);
    add("block.plank", "wood", [0, 1.25, half], [0, 0, 0]);
    add("block.plank", "wood", [-half, 1.25, 0], [0, Math.PI / 2, 0]);
    add("block.plank", "wood", [half, 1.25, 0], [0, Math.PI / 2, 0]);
    addTarget([0, 0.7, 0]);
  } else {
    const count = 10 + complexity * 5;
    const assets = [
      "block.cube",
      "block.long",
      "block.plank",
      "block.cylinder",
      "block.pillar",
      "block.wedge",
    ];
    const materials = ["wood", "stone", "metal", "ceramic_cyan", "ceramic_amber"];
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 0.4 + random() * (2.2 + complexity * 0.18);
      const asset = assets[Math.floor(random() * assets.length)];
      const material = materials[Math.floor(random() * materials.length)];
      add(
        asset,
        material,
        [Math.cos(angle) * radius, 0.6 + random() * (1.2 + complexity * 0.35), Math.sin(angle) * radius],
        [random() * 0.35, random() * Math.PI, random() * 0.35],
      );
    }
    addTarget([0, 0.7 + complexity * 0.32, 0]);
  }

  const generated: HappyBlocksLevel = JSON.parse(JSON.stringify(source)) as HappyBlocksLevel;
  generated.id = `generated-${options.template}-${options.seed || "seed"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 80);
  generated.name = `Generated ${options.template[0].toUpperCase()}${options.template.slice(1)}`;
  generated.mode = options.template === "domino" || options.template === "chaos" ? "chainReaction" : "throw";
  generated.entities = entities;
  generated.inventory = {
    "projectile.ball": Math.max(2, Math.ceil(complexity / 2)),
    "projectile.heavy": complexity >= 3 ? 1 : 0,
    "projectile.pulse": complexity >= 5 ? 1 : 0,
  };
  generated.objectives = [
    {
      type: "knockDown",
      targetTag: "target",
      maxUpDot: 0.52,
      required: 1,
    },
  ];
  generated.scoring = {
    base: 1200 + complexity * 180,
    projectilePenalty: 150 + complexity * 8,
    impactComboWindowMs: 900,
    comboMultiplier: 1.18,
    starThresholds: [
      550 + complexity * 80,
      900 + complexity * 110,
      1200 + complexity * 150,
    ],
  };
  return generated;
}
