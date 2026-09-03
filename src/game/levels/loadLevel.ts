import { setActiveLevelPresentation } from "./LevelPresentation";
import type { HappyBlocksLevel } from "./types";

export async function loadLevel(url: string): Promise<HappyBlocksLevel> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load level: ${url} (${response.status})`);
  }
  const level = (await response.json()) as HappyBlocksLevel;
  setActiveLevelPresentation(level);
  return level;
}
