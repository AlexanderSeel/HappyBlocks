import "./styles.css";
import "@babylonjs/loaders/glTF";
import { HappyBlocksGame } from "./game/HappyBlocksGame";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("#game-canvas was not found");

const game = new HappyBlocksGame(canvas);
await game.start("/levels/level_001_first_collapse.json");
window.addEventListener("beforeunload", () => game.dispose(), { once: true });
