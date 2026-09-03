import "./styles.css";
import "@babylonjs/loaders/glTF";
import { HappyBlocksGame } from "./game/HappyBlocksGame";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) {
  throw new Error("#game-canvas was not found");
}

const game = new HappyBlocksGame(canvas);
const levelButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-level-url]"),
];

for (const button of levelButtons) {
  button.addEventListener("click", () => {
    const levelUrl = button.dataset.levelUrl;
    if (!levelUrl) {
      return;
    }

    for (const candidate of levelButtons) {
      candidate.dataset.active = String(candidate === button);
    }
    void game.loadLevel(levelUrl);
  });
}

await game.start("/levels/level_001_first_collapse.json");
window.addEventListener("beforeunload", () => game.dispose(), { once: true });
