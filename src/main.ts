import "./styles.css";
import "@babylonjs/loaders/glTF";
import { HappyBlocksGame } from "./game/HappyBlocksGame";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) {
  throw new Error("#game-canvas was not found");
}

const levelUrls = [
  "/levels/level_001_first_collapse.json",
  "/levels/level_002_crossfire.json",
  "/levels/level_003_ricochet_lab.json",
];
const game = new HappyBlocksGame(canvas);
game.setLevelSequence(levelUrls);

const levelButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-level-url]"),
];

for (const button of levelButtons) {
  button.addEventListener("click", () => {
    const levelUrl = button.dataset.levelUrl;
    if (!levelUrl) {
      return;
    }
    void game.loadLevel(levelUrl);
  });
}

await game.start(levelUrls[0]);
window.addEventListener("beforeunload", () => game.dispose(), { once: true });
