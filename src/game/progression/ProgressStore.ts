export interface LevelProgress {
  bestScore: number;
  stars: number;
  completedAt: string;
}

interface StoredProgress {
  version: 1;
  levels: Record<string, LevelProgress>;
}

const STORAGE_KEY = "happyblocks.progress.v1";

export class ProgressStore {
  private data: StoredProgress = this.load();

  get(levelUrl: string): LevelProgress | undefined {
    return this.data.levels[levelUrl];
  }

  isCompleted(levelUrl: string): boolean {
    return Boolean(this.get(levelUrl)?.completedAt);
  }

  isUnlocked(sequence: string[], levelUrl: string): boolean {
    const index = sequence.indexOf(levelUrl);
    if (index <= 0) {
      return true;
    }
    return this.isCompleted(sequence[index - 1]);
  }

  recordResult(levelUrl: string, score: number, stars: number): LevelProgress {
    const previous = this.get(levelUrl);
    const result: LevelProgress = {
      bestScore: Math.max(previous?.bestScore ?? 0, Math.round(score)),
      stars: Math.max(previous?.stars ?? 0, Math.max(0, Math.min(3, stars))),
      completedAt: previous?.completedAt ?? new Date().toISOString(),
    };
    this.data.levels[levelUrl] = result;
    this.persist();
    return result;
  }

  private load(): StoredProgress {
    if (typeof window === "undefined") {
      return { version: 1, levels: {} };
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { version: 1, levels: {} };
      }
      const parsed = JSON.parse(raw) as Partial<StoredProgress>;
      if (parsed.version !== 1 || !parsed.levels) {
        return { version: 1, levels: {} };
      }
      return { version: 1, levels: parsed.levels };
    } catch {
      return { version: 1, levels: {} };
    }
  }

  private persist(): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Progress persistence is optional; gameplay continues if storage is unavailable.
    }
  }
}
