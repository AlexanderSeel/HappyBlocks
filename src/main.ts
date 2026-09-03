import "./styles.css";
import "./editor.css";
import "./editor-rules.css";
import "./ui-kit.css";
import "@babylonjs/loaders/glTF";
import { HappyBlocksGame } from "./game/HappyBlocksGame";
import { installEditorLevelSettingsPanel } from "./game/editor/EditorLevelSettingsPanel";
import { installEditorRulesPanel } from "./game/editor/EditorRulesPanel";
import { installEditorScoringPanel } from "./game/editor/EditorScoringPanel";
import { installEditorStructurePalette } from "./game/editor/EditorStructurePalette";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("#game-canvas was not found");

const levelUrls = [
  "/levels/level_001_first_collapse.json",
  "/levels/level_002_crossfire.json",
  "/levels/level_003_ricochet_lab.json",
  "/levels/level_004_precision_pull.json",
  "/levels/level_005_guardian.json",
  "/levels/level_006_sky_citadel.json",
  "/levels/level_007_iron_labyrinth.json",
  "/levels/level_008_combo_foundry.json",
];
const game = new HappyBlocksGame(canvas);
game.setLevelSequence(levelUrls);

const levelButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-level-url]"),
];
for (const button of levelButtons) {
  button.addEventListener("click", () => {
    const levelUrl = button.dataset.levelUrl;
    if (!levelUrl || button.disabled) return;
    void game.loadLevel(levelUrl);
  });
}

await game.start(levelUrls[0]);
installEditorStructurePalette();
installEditorRulesPanel();
installEditorLevelSettingsPanel();
installEditorScoringPanel();
window.addEventListener("beforeunload", () => game.dispose(), { once: true });
