import type { HappyBlocksLevel, LevelEntity, Vec3Tuple } from "../levels/types";
import { getGeneratorTuning } from "./GeneratorTuning";

export type GeneratorTemplate =
  | "tower"
  | "bridge"
  | "domino"
  | "fortress"
  | "chaos"
  | "pyramid"
  | "skyline"
  | "pinball"
  | "spiral"
  | "gauntlet";

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateLevel(
  source: HappyBlocksLevel,
  options: LevelGeneratorOptions,
): HappyBlocksLevel {
  const complexity = clamp(Math.round(options.complexity), 1, 8);
  const tuning = getGeneratorTuning();
  const random = mulberry32(hashSeed(options.seed || "happyblocks"));
  const entities: LevelEntity[] = [];
  let counter = 0;

  const footprint = clamp(tuning.footprint, 0.6, 1.8);
  const heightScale = clamp(tuning.height, 0.55, 1.9);
  const density = clamp(tuning.density, 0.45, 1.65);
  const stability = clamp(tuning.stability, 0.2, 1);
  const breakables = clamp(tuning.breakables, 0, 1);
  const mechanisms = clamp(tuning.mechanisms, 0, 1);
  const bumpers = clamp(tuning.bumpers, 0, 1);
  const symmetry = clamp(tuning.symmetry, 0, 1);
  const floorStep = 1.1 * heightScale;
  const tilt = (1 - stability) * 0.09;

  const jitterRotation = (base: Vec3Tuple = [0, 0, 0]): Vec3Tuple => [
    base[0] + (random() - 0.5) * tilt,
    base[1] + (random() - 0.5) * tilt * 0.8,
    base[2] + (random() - 0.5) * tilt,
  ];

  const add = (
    asset: string,
    material: string,
    position: Vec3Tuple,
    rotation: Vec3Tuple = [0, 0, 0],
    tags: string[] = [],
    motion: "STATIC" | "DYNAMIC" = "DYNAMIC",
    scale: Vec3Tuple = [1, 1, 1],
    extra: Partial<LevelEntity> = {},
  ): LevelEntity => {
    const entity: LevelEntity = {
      id: `generated-${++counter}`,
      asset,
      material,
      position,
      rotation,
      scale,
      motion,
      tags,
      ...extra,
    };
    entities.push(entity);
    return entity;
  };

  const target = (position: Vec3Tuple, material = "ceramic_violet"): void => {
    add("target.totem", material, position, [0, 0, 0], ["target"]);
  };

  const maybeBreakable = (position: Vec3Tuple, material = "ceramic_cyan"): boolean => {
    if (random() > breakables) return false;
    add(
      "breakable.column",
      material,
      position,
      jitterRotation(),
      ["breakable", "structure"],
      "DYNAMIC",
      [1, 1, 1],
      { breakThreshold: 3.8 + stability * 1.8 },
    );
    return true;
  };

  const maybeSpinner = (position: Vec3Tuple): void => {
    if (random() <= mechanisms) {
      add("spinner.cross", "metal", position, [0, 0, 0], ["mechanism"]);
    }
  };

  const maybeBumper = (position: Vec3Tuple): void => {
    if (random() <= bumpers) {
      add("bumper.round", "rubber", position, [0, 0, 0], ["bumper"], "STATIC");
    }
  };

  const column = (
    x: number,
    z: number,
    floors: number,
    materialA: string,
    materialB: string,
  ): void => {
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 0.5 + floor * floorStep;
      const halfWidth = 0.72 * footprint;
      const rotation = jitterRotation();
      add("block.cube", floor % 2 ? materialA : materialB, [x - halfWidth, y, z], rotation);
      add(
        "block.cube",
        floor % 2 ? materialB : materialA,
        [x + halfWidth, y, z],
        symmetry > random() ? [-rotation[0], -rotation[1], -rotation[2]] : jitterRotation(),
      );
      add(
        "block.plank",
        "wood",
        [x, y + 0.58 * heightScale, z],
        jitterRotation([0, floor % 2 ? 0.025 : -0.025, 0]),
        ["beam"],
        "DYNAMIC",
        [footprint, 1, 1],
      );
      if (floor % 2 === 0 && complexity >= 4 && density > 0.7) {
        add(
          "block.rod",
          "metal",
          [x, y + 0.2, z - 0.48 * footprint],
          [Math.PI / 2, 0, Math.PI / 2],
          ["brace"],
          "DYNAMIC",
          [0.75, 0.75 * heightScale, 0.75],
        );
      }
    }
  };

  if (options.template === "tower") {
    const floors = Math.max(3, Math.round((3 + complexity) * density * 0.88));
    const spread = 1.45 * footprint;
    column(-spread, 0, floors, "stone", "ceramic_cyan");
    column(spread, 0, floors, "stone", "ceramic_amber");
    for (let floor = 1; floor < floors; floor += 2) {
      add(
        "block.slab",
        "metal",
        [0, floor * floorStep + 0.35, 0],
        jitterRotation(),
        ["skybridge"],
        "DYNAMIC",
        [1.15 * footprint, 1, 0.85],
      );
    }
    if (complexity >= 4) {
      maybeSpinner([0, 2.7 * heightScale, -1.25 * footprint]);
      maybeBreakable([0, 1.2 * heightScale, 1.25 * footprint]);
    }
    target([0, floors * floorStep + 0.72, 0]);
  } else if (options.template === "bridge") {
    const spans = Math.max(3, Math.round((3 + complexity) * density * 0.85));
    const spacing = 1.45 * footprint;
    const lane = 1.65 * footprint;
    const start = -((spans - 1) * spacing) / 2;
    for (let index = 0; index < spans; index += 1) {
      const x = start + index * spacing;
      add("block.pillar", index % 2 ? "stone" : "ceramic_cyan", [x, 1.05 * heightScale, 0], jitterRotation());
      add("block.pillar", index % 2 ? "stone" : "ceramic_amber", [x, 1.05 * heightScale, lane], jitterRotation());
      add("block.plank", "metal", [x, 2.25 * heightScale, lane / 2], [0, 0, Math.PI / 2], ["crossbeam"], "DYNAMIC", [0.72 * footprint, 1, 1]);
      if (index < spans - 1) {
        add("block.plank", "wood", [x + spacing / 2, 2.35 * heightScale, 0], jitterRotation(), ["deck"], "DYNAMIC", [footprint, 1, 1]);
        add("block.plank", "wood", [x + spacing / 2, 2.35 * heightScale, lane], jitterRotation(), ["deck"], "DYNAMIC", [footprint, 1, 1]);
        if (density > 0.65) {
          add("block.rod", "metal", [x + spacing / 2, 3.05 * heightScale, lane / 2], [0, 0, Math.PI / 2], ["truss"], "DYNAMIC", [0.8, heightScale, 0.8]);
        }
      }
    }
    maybeSpinner([0, 1.25 * heightScale, -1.45 * footprint]);
    maybeBumper([2.2 * footprint, 0.22, -1.2 * footprint]);
    target([0, 2.95 * heightScale, lane / 2]);
  } else if (options.template === "domino") {
    const count = Math.max(12, Math.round((12 + complexity * 5) * density));
    for (let index = 0; index < count; index += 1) {
      const t = index / Math.max(1, count - 1);
      const angle = t * Math.PI * 2.3;
      const radius = (1.4 + t * (2.6 + complexity * 0.15)) * footprint;
      const useBreakable = index % 7 === 0 && random() < breakables;
      add(
        useBreakable ? "breakable.column" : "block.rod",
        index % 3 === 0 ? "ceramic_cyan" : index % 3 === 1 ? "wood" : "stone",
        [Math.cos(angle) * radius, useBreakable ? 1.2 * heightScale : 1.35 * heightScale, Math.sin(angle) * radius],
        jitterRotation([0, -angle + Math.PI / 2, 0]),
        useBreakable ? ["breakable"] : ["domino"],
        "DYNAMIC",
        [1, heightScale, 1],
        useBreakable ? { breakThreshold: 4.2 } : {},
      );
    }
    maybeBumper([0, 0.22, 0]);
    target([
      Math.cos(Math.PI * 2.3) * (4 + complexity * 0.15) * footprint,
      0.7 * heightScale,
      Math.sin(Math.PI * 2.3) * (4 + complexity * 0.15) * footprint,
    ]);
  } else if (options.template === "fortress") {
    const half = (2.2 + complexity * 0.18) * footprint;
    const floors = Math.max(2, Math.round((2 + Math.ceil(complexity / 2)) * heightScale * 0.8));
    const corners: Array<[number, number]> = [
      [-half, -half],
      [half, -half],
      [-half, half],
      [half, half],
    ];
    for (const [x, z] of corners) {
      column(x, z, floors, "stone", "ceramic_amber");
      add("block.slab", "metal", [x, floors * floorStep + 0.4, z], [0, 0, 0], ["battlement"], "DYNAMIC", [1.25, 1, 1.25]);
    }
    const wallSteps = Math.max(3, Math.round(5 * density));
    for (const side of [-1, 1]) {
      for (let index = 0; index < wallSteps; index += 1) {
        const t = wallSteps === 1 ? 0 : index / (wallSteps - 1);
        const offset = -half + t * half * 2;
        add("block.pillar", "stone", [offset, 1.05 * heightScale, side * half], jitterRotation(), ["wall"]);
        add("block.pillar", "stone", [side * half, 1.05 * heightScale, offset], jitterRotation(), ["wall"]);
      }
    }
    if (!maybeBreakable([0, 1.2 * heightScale, -half])) {
      add("block.pillar", "ceramic_cyan", [0, 1.05 * heightScale, -half], [0, 0, 0], ["gate"]);
    }
    maybeSpinner([0, 2.5 * heightScale, -half - 0.55]);
    add("goal.energyCore", "energy", [0, 0.48, 0], [0, 0, 0], ["protected-core"]);
    target([0, 1.15 * heightScale, half * 0.35]);
  } else if (options.template === "pyramid") {
    const layers = Math.max(3, Math.round((3 + complexity * 0.6) * heightScale));
    const spacing = 1.08 * footprint;
    for (let layer = 0; layer < layers; layer += 1) {
      const width = Math.max(1, layers - layer);
      const y = 0.5 + layer * 1.02 * heightScale;
      for (let row = 0; row < width; row += 1) {
        for (let col = 0; col < width; col += 1) {
          if (random() > density * 0.72 + 0.18 && layer < layers - 1) continue;
          const x = (col - (width - 1) / 2) * spacing;
          const z = (row - (width - 1) / 2) * spacing;
          const breakable = layer < 2 && random() < breakables * 0.16;
          if (breakable) {
            maybeBreakable([x, 1.2 * heightScale, z], layer % 2 ? "ceramic_amber" : "ceramic_cyan");
          } else {
            add("block.cube", layer % 2 ? "stone" : "ceramic_amber", [x, y, z], jitterRotation(), ["pyramid"]);
          }
        }
      }
    }
    maybeBumper([0, 0.22, -layers * spacing * 0.72]);
    target([0, layers * 1.02 * heightScale + 0.25, 0]);
  } else if (options.template === "skyline") {
    const districts = Math.max(4, Math.round((4 + complexity) * density));
    const radius = (2.1 + complexity * 0.32) * footprint;
    for (let index = 0; index < districts; index += 1) {
      const angle = (index / districts) * Math.PI * 2;
      const ring = radius * (0.62 + random() * 0.38);
      const x = Math.cos(angle) * ring;
      const z = Math.sin(angle) * ring;
      const floors = Math.max(2, Math.round((2 + random() * (2 + complexity * 0.55)) * heightScale));
      column(x, z, floors, index % 2 ? "stone" : "ceramic_cyan", index % 3 ? "metal" : "ceramic_amber");
      if (random() < breakables) maybeBreakable([x + 0.82 * footprint, 1.2 * heightScale, z]);
      if (random() < bumpers) maybeBumper([x * 0.72, 0.22, z * 0.72]);
    }
    maybeSpinner([0, 1.65 * heightScale, 0]);
    target([0, 2.7 * heightScale + complexity * 0.2, 0]);
  } else if (options.template === "pinball") {
    const rows = Math.max(3, Math.round((3 + complexity * 0.55) * density));
    const width = (3.2 + complexity * 0.28) * footprint;
    add("block.wedge", "metal", [-width * 0.82, 0.5, -3.3 * footprint], [0, Math.PI / 2, 0], ["ramp"], "STATIC", [1.25, 1, 1.25]);
    add("block.wedge", "metal", [width * 0.82, 0.5, -3.3 * footprint], [0, -Math.PI / 2, 0], ["ramp"], "STATIC", [1.25, 1, 1.25]);
    for (let row = 0; row < rows; row += 1) {
      const count = row + 3;
      const z = -1.4 * footprint + row * 1.25 * footprint;
      for (let index = 0; index < count; index += 1) {
        const x = ((index / Math.max(1, count - 1)) * 2 - 1) * width;
        if (random() <= Math.max(0.22, bumpers)) {
          add("bumper.round", "rubber", [x, 0.22, z], [0, 0, 0], ["bumper"], "STATIC");
        }
      }
      if (random() < mechanisms) maybeSpinner([0, 1.15 + row * 0.14, z + 0.55 * footprint]);
    }
    for (const x of [-width * 0.62, width * 0.62]) {
      add("block.pillar", "stone", [x, 1.05 * heightScale, rows * 1.25 * footprint], [0, 0, 0], ["goal-frame"]);
    }
    add("block.plank", "wood", [0, 2.2 * heightScale, rows * 1.25 * footprint], [0, 0, 0], ["goal-frame"], "DYNAMIC", [width / 2.3, 1, 1]);
    target([0, 1.05 * heightScale, rows * 1.25 * footprint + 0.4]);
  } else if (options.template === "spiral") {
    const count = Math.max(18, Math.round((18 + complexity * 5) * density));
    const maxRadius = (2.6 + complexity * 0.28) * footprint;
    for (let index = 0; index < count; index += 1) {
      const t = index / Math.max(1, count - 1);
      const angle = t * Math.PI * (4.2 + complexity * 0.16);
      const radius = maxRadius * (1 - t * 0.68);
      const y = 0.66 + t * 1.15 * heightScale;
      const useBreakable = index % 9 === 0 && random() < breakables;
      add(
        useBreakable ? "breakable.column" : "block.rod",
        index % 4 === 0 ? "ceramic_violet" : index % 2 ? "wood" : "stone",
        [Math.cos(angle) * radius, useBreakable ? 1.2 * heightScale : y, Math.sin(angle) * radius],
        jitterRotation([0, -angle + Math.PI / 2, 0]),
        useBreakable ? ["breakable", "spiral"] : ["spiral"],
        "DYNAMIC",
        useBreakable ? [1, 1, 1] : [0.9, heightScale, 0.9],
        useBreakable ? { breakThreshold: 4.1 } : {},
      );
      if (index % 8 === 4 && random() < bumpers) {
        maybeBumper([Math.cos(angle) * radius * 0.78, 0.22, Math.sin(angle) * radius * 0.78]);
      }
    }
    maybeSpinner([0, 1.35, 0]);
    target([0, 0.78, 0]);
  } else if (options.template === "gauntlet") {
    const sections = Math.max(4, Math.round((4 + complexity * 0.7) * density));
    const spacing = 2.2 * footprint;
    const startZ = -((sections - 1) * spacing) / 2;
    for (let section = 0; section < sections; section += 1) {
      const z = startZ + section * spacing;
      const width = (1.9 + (section % 3) * 0.35) * footprint;
      add("block.pillar", section % 2 ? "stone" : "metal", [-width, 1.05 * heightScale, z], jitterRotation(), ["gauntlet"]);
      add("block.pillar", section % 2 ? "stone" : "metal", [width, 1.05 * heightScale, z], jitterRotation(), ["gauntlet"]);
      add("block.plank", "wood", [0, 2.2 * heightScale, z], jitterRotation(), ["gauntlet"], "DYNAMIC", [width / 1.35, 1, 1]);
      if (!maybeBreakable([0, 1.2 * heightScale, z])) {
        add("block.cube", section % 2 ? "ceramic_cyan" : "ceramic_amber", [0, 0.5, z], jitterRotation(), ["gauntlet"]);
      }
      if (section % 2 === 1) maybeSpinner([0, 1.35 * heightScale, z + spacing * 0.42]);
      if (section % 2 === 0) {
        maybeBumper([-width * 0.58, 0.22, z + spacing * 0.44]);
        maybeBumper([width * 0.58, 0.22, z + spacing * 0.44]);
      }
    }
    target([0, 0.82, startZ + sections * spacing]);
  } else {
    const districts = Math.max(2, Math.round((2 + Math.ceil(complexity / 2)) * density));
    for (let district = 0; district < districts; district += 1) {
      const angle = (district / districts) * Math.PI * 2;
      const radius = (2.3 + complexity * 0.25) * footprint;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const floors = Math.max(2, Math.round((2 + random() * (2 + complexity / 2)) * heightScale));
      column(cx, cz, floors, district % 2 ? "stone" : "ceramic_cyan", district % 2 ? "ceramic_amber" : "wood");
      if (district % 2 === 0) {
        add("block.wedge", "metal", [cx, floors * floorStep + 0.7, cz], [0, random() * Math.PI, 0], ["roof"], "DYNAMIC", [1.3, 1, 1.3]);
      }
      if (random() < breakables) maybeBreakable([cx * 0.74, 1.2 * heightScale, cz * 0.74]);
    }
    const bumperCount = Math.round((3 + complexity) * Math.max(0.25, bumpers));
    for (let index = 0; index < bumperCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 1 + random() * 4.8 * footprint;
      add("bumper.round", "rubber", [Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius], [0, 0, 0], ["bumper"], "STATIC");
    }
    maybeSpinner([0, 2.1 * heightScale, -1.4 * footprint]);
    target([0, 3.3 * heightScale + complexity * 0.18, 0]);
  }

  const generated = JSON.parse(JSON.stringify(source)) as HappyBlocksLevel;
  const cleanSeed = (options.seed || "seed").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  generated.id = `generated-${options.template}-${cleanSeed}`.slice(0, 80);
  generated.name = `Generated ${options.template[0].toUpperCase()}${options.template.slice(1)}`;
  generated.mode =
    options.template === "pinball" || options.template === "gauntlet"
      ? "scoreAttack"
      : options.template === "domino" || options.template === "chaos" || options.template === "spiral"
        ? "chainReaction"
        : "throw";
  generated.entities = entities;
  generated.inventory = {
    "projectile.ball": Math.max(3, Math.ceil(complexity / 2) + 1),
    "projectile.heavy": complexity >= 2 ? 2 : 1,
    "projectile.pulse": complexity >= 4 ? 1 : 0,
  };
  if (generated.mode === "scoreAttack") {
    generated.inventory["projectile.ball"] += 3;
    generated.inventory["projectile.heavy"] += 1;
  }
  generated.projectileSkins = {
    "projectile.ball": options.template === "domino" ? "rubber" : "chrome",
    "projectile.heavy": "concrete",
    "projectile.pulse": "ceramic",
  };
  const skyByTemplate: Record<GeneratorTemplate, string> = {
    tower: "clear_lab",
    bridge: "stormfront",
    domino: "neon_twilight",
    fortress: "sunset_foundry",
    chaos: "deep_space",
    pyramid: "sunset_foundry",
    skyline: "neon_twilight",
    pinball: "aurora_night",
    spiral: "deep_space",
    gauntlet: "stormfront",
  };
  generated.environment = {
    skybox: skyByTemplate[options.template],
    intensity: options.template === "deep_space" ? 0.8 : 1,
    rotationY: random() * Math.PI * 2,
  };
  generated.objectives = [
    { type: "knockDown", targetTag: "target", maxUpDot: 0.52, required: 1 },
  ];
  generated.scoring = {
    base: 1500 + complexity * 240,
    projectilePenalty: generated.mode === "scoreAttack" ? 45 : 170 + complexity * 10,
    impactComboWindowMs: 950 + Math.round(mechanisms * 350),
    comboMultiplier: 1.16 + mechanisms * 0.12,
    starThresholds: [
      700 + complexity * 100,
      1100 + complexity * 145,
      1500 + complexity * 190,
    ],
  };
  return generated;
}
