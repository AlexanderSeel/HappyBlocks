export type Vec3Tuple = [number, number, number];
export type MotionType = "STATIC" | "DYNAMIC";
export type LevelMode = "throw" | "chainReaction" | "remove" | "protect" | "scoreAttack";
export type ProjectileSurface = "chrome" | "rubber" | "concrete" | "ceramic";

export interface LevelEnvironment {
  skybox?: string;
  intensity?: number;
  rotationY?: number;
}

export interface LevelEntity {
  id: string;
  asset: string;
  material?: string;
  position: Vec3Tuple;
  rotation?: Vec3Tuple;
  scale?: Vec3Tuple;
  motion: MotionType;
  tags?: string[];
  massScale?: number;
  breakThreshold?: number;
}

export interface MoveBelowYObjective {
  type: "moveBelowY";
  targetTag: string;
  y: number;
  required: number;
}

export interface KnockDownObjective {
  type: "knockDown";
  targetTag: string;
  maxUpDot: number;
  required: number;
}

export interface RemovedObjective {
  type: "removed";
  targetTag: string;
  required: number;
}

export interface ProtectObjective {
  type: "protect";
  targetTag: string;
  minY: number;
  minUpDot?: number;
  required: number;
}

export type LevelObjective =
  | MoveBelowYObjective
  | KnockDownObjective
  | RemovedObjective
  | ProtectObjective;

export interface HappyBlocksLevel {
  id: string;
  name: string;
  mode: LevelMode;
  arena: { platform: string; gravity: Vec3Tuple };
  environment?: LevelEnvironment;
  camera: {
    target: Vec3Tuple;
    alpha: number;
    beta: number;
    radius: number;
    minRadius?: number;
    maxRadius?: number;
  };
  inventory: Record<string, number>;
  projectileSkins?: Record<string, ProjectileSurface>;
  actions?: { removes?: number };
  entities: LevelEntity[];
  objectives: LevelObjective[];
  scoring?: {
    base?: number;
    projectilePenalty?: number;
    timePenaltyPerSecond?: number;
    impactComboWindowMs?: number;
    comboMultiplier?: number;
    starThresholds?: [number, number, number];
  };
}
