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

const SKIES: Record<GeneratorTemplate, string> = {
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

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomSource(seed: string): () => number {
  let state = hashSeed(seed || "happyblocks");
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function generateLevel(
  source: HappyBlocksLevel,
  options: LevelGeneratorOptions,
): HappyBlocksLevel {
  const complexity = clamp(Math.round(options.complexity), 1, 8);
  const tuning = getGeneratorTuning();
  const random = randomSource(options.seed);
  const footprint = clamp(tuning.footprint, 0.6, 1.8);
  const height = clamp(tuning.height, 0.55, 1.9);
  const density = clamp(tuning.density, 0.45, 1.65);
  const stability = clamp(tuning.stability, 0.2, 1);
  const breakables = clamp(tuning.breakables, 0, 1);
  const mechanisms = clamp(tuning.mechanisms, 0, 1);
  const bumpers = clamp(tuning.bumpers, 0, 1);
  const symmetry = clamp(tuning.symmetry, 0, 1);
  const entities: LevelEntity[] = [];
  let id = 0;

  const jitter = (): number => (random() - 0.5) * (1 - stability) * 0.08;
  const rot = (y = 0): Vec3Tuple => [jitter(), y + jitter(), jitter()];
  const add = (
    asset: string,
    material: string,
    position: Vec3Tuple,
    rotation: Vec3Tuple = [0, 0, 0],
    tags: string[] = [],
    motion: "STATIC" | "DYNAMIC" = "DYNAMIC",
    scale: Vec3Tuple = [1, 1, 1],
    extra: Partial<LevelEntity> = {},
  ): void => {
    entities.push({
      id: `generated-${++id}`,
      asset,
      material,
      position,
      rotation,
      scale,
      motion,
      tags,
      ...extra,
    });
  };
  const target = (position: Vec3Tuple): void =>
    add("target.totem", "ceramic_violet", position, [0, 0, 0], ["target"]);
  const bumper = (position: Vec3Tuple): void =>
    add("bumper.round", "rubber", position, [0, 0, 0], ["bumper"], "STATIC");
  const spinner = (position: Vec3Tuple): void =>
    add("spinner.cross", "metal", position, [0, 0, 0], ["mechanism"]);
  const breakable = (position: Vec3Tuple, material = "ceramic_cyan"): void =>
    add(
      "breakable.column",
      material,
      position,
      rot(),
      ["breakable"],
      "DYNAMIC",
      [1, 1, 1],
      { breakThreshold: 3.8 + stability * 1.8 },
    );

  const tower = (cx: number, cz: number, floors: number, accent: string): void => {
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 0.5 + floor * 1.12 * height;
      const half = 0.7 * footprint;
      const first = rot();
      add("block.cube", floor % 2 ? accent : "stone", [cx - half, y, cz], first);
      add(
        "block.cube",
        floor % 2 ? "stone" : accent,
        [cx + half, y, cz],
        random() < symmetry ? [-first[0], -first[1], -first[2]] : rot(),
      );
      add(
        "block.plank",
        "wood",
        [cx, y + 0.58 * height, cz],
        rot(),
        ["beam"],
        "DYNAMIC",
        [footprint, 1, 1],
      );
    }
  };

  switch (options.template) {
    case "tower": {
      const floors = Math.max(3, Math.round((3 + complexity) * density * 0.85));
      tower(-1.45 * footprint, 0, floors, "ceramic_cyan");
      tower(1.45 * footprint, 0, floors, "ceramic_amber");
      if (random() < mechanisms) spinner([0, 2.5 * height, -1.2 * footprint]);
      if (random() < breakables) breakable([0, 1.2 * height, 1.25 * footprint]);
      target([0, floors * 1.12 * height + 0.7, 0]);
      break;
    }
    case "bridge": {
      const spans = Math.max(3, Math.round((3 + complexity) * density * 0.8));
      const spacing = 1.5 * footprint;
      const start = -((spans - 1) * spacing) / 2;
      for (let index = 0; index < spans; index += 1) {
        const x = start + index * spacing;
        add("block.pillar", "stone", [x, 1.05 * height, -0.8 * footprint], rot());
        add("block.pillar", index % 2 ? "ceramic_cyan" : "ceramic_amber", [x, 1.05 * height, 0.8 * footprint], rot());
        if (index < spans - 1) {
          add("block.slab", "metal", [x + spacing / 2, 2.2 * height, 0], rot(), ["bridge"], "DYNAMIC", [0.85 * footprint, 1, 1]);
        }
      }
      if (random() < mechanisms) spinner([0, 1.3 * height, -2 * footprint]);
      if (random() < bumpers) bumper([2.2 * footprint, 0.22, -1.4 * footprint]);
      target([0, 2.9 * height, 0]);
      break;
    }
    case "domino": {
      const count = Math.max(12, Math.round((12 + complexity * 5) * density));
      for (let index = 0; index < count; index += 1) {
        const t = index / Math.max(1, count - 1);
        const angle = t * Math.PI * 2.35;
        const radius = (1.3 + t * (2.7 + complexity * 0.16)) * footprint;
        if (index % 8 === 0 && random() < breakables) {
          breakable([Math.cos(angle) * radius, 1.2 * height, Math.sin(angle) * radius]);
        } else {
          add(
            "block.rod",
            index % 2 ? "wood" : "ceramic_cyan",
            [Math.cos(angle) * radius, 1.35 * height, Math.sin(angle) * radius],
            rot(-angle + Math.PI / 2),
            ["domino"],
            "DYNAMIC",
            [1, height, 1],
          );
        }
      }
      if (random() < bumpers) bumper([0, 0.22, 0]);
      target([4.2 * footprint, 0.72, 1.1 * footprint]);
      break;
    }
    case "fortress": {
      const half = (2.3 + complexity * 0.18) * footprint;
      const floors = Math.max(2, Math.round((2 + complexity / 2) * height * 0.8));
      for (const [x, z, accent] of [
        [-half, -half, "ceramic_cyan"],
        [half, -half, "ceramic_amber"],
        [-half, half, "ceramic_amber"],
        [half, half, "ceramic_cyan"],
      ] as Array<[number, number, string]>) {
        tower(x, z, floors, accent);
      }
      for (let step = -2; step <= 2; step += 1) {
        const x = (step * half) / 2;
        add("block.pillar", "stone", [x, 1.05 * height, -half], rot(), ["wall"]);
        add("block.pillar", "stone", [x, 1.05 * height, half], rot(), ["wall"]);
      }
      if (random() < breakables) breakable([0, 1.2 * height, -half], "ceramic_amber");
      if (random() < mechanisms) spinner([0, 2.5 * height, -half - 0.6]);
      target([0, 1.0, half * 0.35]);
      break;
    }
    case "pyramid": {
      const layers = Math.max(3, Math.round((3 + complexity * 0.55) * height));
      const spacing = 1.05 * footprint;
      for (let layer = 0; layer < layers; layer += 1) {
        const width = layers - layer;
        for (let row = 0; row < width; row += 1) {
          for (let column = 0; column < width; column += 1) {
            if (layer < layers - 1 && random() > 0.38 + density * 0.38) continue;
            const x = (column - (width - 1) / 2) * spacing;
            const z = (row - (width - 1) / 2) * spacing;
            add("block.cube", layer % 2 ? "stone" : "ceramic_amber", [x, 0.5 + layer * height, z], rot(), ["pyramid"]);
          }
        }
      }
      if (random() < bumpers) bumper([0, 0.22, -layers * 0.8 * footprint]);
      target([0, layers * height + 0.35, 0]);
      break;
    }
    case "skyline": {
      const towers = Math.max(4, Math.round((4 + complexity) * density));
      const radius = (2.2 + complexity * 0.3) * footprint;
      for (let index = 0; index < towers; index += 1) {
        const angle = (index / towers) * Math.PI * 2;
        const ring = radius * (0.62 + random() * 0.38);
        const floors = Math.max(2, Math.round((2 + random() * (2 + complexity * 0.55)) * height));
        tower(Math.cos(angle) * ring, Math.sin(angle) * ring, floors, index % 2 ? "ceramic_cyan" : "ceramic_amber");
        if (random() < bumpers) bumper([Math.cos(angle) * ring * 0.68, 0.22, Math.sin(angle) * ring * 0.68]);
      }
      if (random() < mechanisms) spinner([0, 1.5 * height, 0]);
      target([0, 3.1 * height, 0]);
      break;
    }
    case "pinball": {
      const rows = Math.max(3, Math.round((3 + complexity * 0.55) * density));
      const width = (3.1 + complexity * 0.26) * footprint;
      add("block.wedge", "metal", [-width * 0.85, 0.5, -3.4 * footprint], [0, Math.PI / 2, 0], ["ramp"], "STATIC");
      add("block.wedge", "metal", [width * 0.85, 0.5, -3.4 * footprint], [0, -Math.PI / 2, 0], ["ramp"], "STATIC");
      for (let row = 0; row < rows; row += 1) {
        const count = row + 3;
        const z = -1.4 * footprint + row * 1.3 * footprint;
        for (let index = 0; index < count; index += 1) {
          if (random() < Math.max(0.35, bumpers)) {
            const x = ((index / Math.max(1, count - 1)) * 2 - 1) * width;
            bumper([x, 0.22, z]);
          }
        }
        if (random() < mechanisms) spinner([0, 1.2 + row * 0.12, z + 0.55]);
      }
      target([0, 0.8, rows * 1.35 * footprint]);
      break;
    }
    case "spiral": {
      const count = Math.max(18, Math.round((18 + complexity * 5) * density));
      const maxRadius = (2.6 + complexity * 0.28) * footprint;
      for (let index = 0; index < count; index += 1) {
        const t = index / Math.max(1, count - 1);
        const angle = t * Math.PI * (4.2 + complexity * 0.18);
        const radius = maxRadius * (1 - t * 0.68);
        add(
          "block.rod",
          index % 3 === 0 ? "ceramic_violet" : index % 2 ? "wood" : "stone",
          [Math.cos(angle) * radius, 0.72 + t * height, Math.sin(angle) * radius],
          rot(-angle + Math.PI / 2),
          ["spiral"],
          "DYNAMIC",
          [0.9, height, 0.9],
        );
        if (index % 9 === 4 && random() < bumpers) bumper([Math.cos(angle) * radius * 0.76, 0.22, Math.sin(angle) * radius * 0.76]);
      }
      if (random() < mechanisms) spinner([0, 1.3, 0]);
      target([0, 0.78, 0]);
      break;
    }
    case "gauntlet": {
      const sections = Math.max(4, Math.round((4 + complexity * 0.7) * density));
      const spacing = 2.2 * footprint;
      const start = -((sections - 1) * spacing) / 2;
      for (let section = 0; section < sections; section += 1) {
        const z = start + section * spacing;
        const half = (1.8 + (section % 3) * 0.35) * footprint;
        add("block.pillar", "stone", [-half, 1.05 * height, z], rot(), ["gauntlet"]);
        add("block.pillar", "stone", [half, 1.05 * height, z], rot(), ["gauntlet"]);
        add("block.plank", "wood", [0, 2.2 * height, z], rot(), ["gauntlet"], "DYNAMIC", [half / 1.3, 1, 1]);
        if (random() < breakables) breakable([0, 1.2 * height, z]);
        else add("block.cube", section % 2 ? "ceramic_cyan" : "ceramic_amber", [0, 0.5, z], rot());
        if (section % 2 && random() < mechanisms) spinner([0, 1.35 * height, z + spacing * 0.4]);
        if (!(section % 2) && random() < bumpers) {
          bumper([-half * 0.58, 0.22, z + spacing * 0.4]);
          bumper([half * 0.58, 0.22, z + spacing * 0.4]);
        }
      }
      target([0, 0.82, start + sections * spacing]);
      break;
    }
    case "chaos": {
      const districts = Math.max(2, Math.round((2 + Math.ceil(complexity / 2)) * density));
      for (let district = 0; district < districts; district += 1) {
        const angle = (district / districts) * Math.PI * 2;
        const radius = (2.3 + complexity * 0.25) * footprint;
        const cx = Math.cos(angle) * radius;
        const cz = Math.sin(angle) * radius;
        tower(cx, cz, Math.max(2, Math.round(2 + random() * complexity * 0.7)), district % 2 ? "ceramic_cyan" : "ceramic_amber");
        if (random() < breakables) breakable([cx * 0.72, 1.2 * height, cz * 0.72]);
      }
      for (let index = 0; index < Math.round((3 + complexity) * Math.max(0.3, bumpers)); index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = (1 + random() * 4.5) * footprint;
        bumper([Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius]);
      }
      if (random() < mechanisms) spinner([0, 2 * height, -1.5 * footprint]);
      target([0, 3.2 * height + complexity * 0.18, 0]);
      break;
    }
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
    "projectile.ball": Math.max(3, Math.ceil(complexity / 2) + 1) + (generated.mode === "scoreAttack" ? 3 : 0),
    "projectile.heavy": (complexity >= 2 ? 2 : 1) + (generated.mode === "scoreAttack" ? 1 : 0),
    "projectile.pulse": complexity >= 4 ? 1 : 0,
  };
  generated.projectileSkins = {
    "projectile.ball": options.template === "domino" ? "rubber" : "chrome",
    "projectile.heavy": "concrete",
    "projectile.pulse": "ceramic",
  };
  const skybox = SKIES[options.template];
  generated.environment = {
    skybox,
    intensity: skybox === "deep_space" ? 0.8 : 1,
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
