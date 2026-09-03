import { setActiveLevelPresentation } from "../levels/LevelPresentation";
import type { HappyBlocksLevel } from "../levels/types";

export function installEditorPresentationSync(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const jsonText = panel?.querySelector<HTMLTextAreaElement>("#editor-json");
  const entitySelect = panel?.querySelector<HTMLSelectElement>("#editor-entity");
  if (!panel || !jsonText || !entitySelect || panel.dataset.presentationSync === "true") {
    return;
  }
  panel.dataset.presentationSync = "true";

  const sync = (): void => {
    try {
      setActiveLevelPresentation(JSON.parse(jsonText.value) as HappyBlocksLevel);
    } catch {
      // Invalid working JSON is handled by the editor's normal validation path.
    }
  };

  new MutationObserver(sync).observe(entitySelect, { childList: true });
  jsonText.addEventListener("change", sync);
  sync();
}
