export type Vec3Tuple = [number, number, number];
export type MotionType = "STATIC" | "DYNAMIC";

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

export type LevelObjective = MoveBelowYObjective | KnockDownObjective;

export interface HappyBlocksLevel {
  id: string;
  name: string;
  mode: string;
  arena: { platform: string; gravity: Vec3Tuple };
  camera: {
    target: Vec3Tuple;
    alpha: number;
    beta: number;
    radius: number;
    minRadius?: number;
    maxRadius?: number;
  };
  inventory: Record<string, number>;
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
