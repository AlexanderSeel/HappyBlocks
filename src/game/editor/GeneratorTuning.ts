export interface GeneratorTuning {
  footprint: number;
  height: number;
  density: number;
  stability: number;
  breakables: number;
  mechanisms: number;
  bumpers: number;
  symmetry: number;
}

export const DEFAULT_GENERATOR_TUNING: GeneratorTuning = {
  footprint: 1,
  height: 1,
  density: 1,
  stability: 0.82,
  breakables: 0.32,
  mechanisms: 0.28,
  bumpers: 0.22,
  symmetry: 0.72,
};

let tuning: GeneratorTuning = { ...DEFAULT_GENERATOR_TUNING };

export function getGeneratorTuning(): GeneratorTuning {
  return { ...tuning };
}

export function setGeneratorTuning(next: Partial<GeneratorTuning>): void {
  tuning = { ...tuning, ...next };
}
