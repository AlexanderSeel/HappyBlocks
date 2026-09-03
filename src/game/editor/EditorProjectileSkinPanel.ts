import type { HappyBlocksLevel, ProjectileSurface } from "../levels/types";
import { PROJECTILE_SURFACE_IDS } from "../rendering/ProjectileMaterialFactory";

const PROJECTILES = [
  ["projectile.ball", "Standard"],
  ["projectile.heavy", "Heavy"],
  ["projectile.pulse", "Pulse"],
] as const;

const DEFAULTS: Record<string, ProjectileSurface> = {
  "projectile.ball": "chrome",
  "projectile.heavy": "concrete",
  "projectile.pulse": "ceramic",
};

export function installEditorProjectileSkinPanel(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const jsonText = panel?.querySelector<HTMLTextAreaElement>("#editor-json");
  const entitySelect = panel?.querySelector<HTMLSelectElement>("#editor-entity");
  const applyJson = panel?.querySelector<HTMLButtonElement>('[data-editor-action="parse"]');
  const scoringPanel = panel?.querySelector<HTMLElement>("[data-editor-scoring]");
  const advancedJson = panel?.querySelector<HTMLElement>(".level-editor__json");
  if (
    !panel ||
    !jsonText ||
    !entitySelect ||
    !applyJson ||
    panel.querySelector("[data-editor-projectile-skins]")
  ) {
    return;
  }

  const section = document.createElement("details");
  section.className = "level-editor__json";
  section.dataset.editorProjectileSkins = "true";
  section.open = false;
  section.innerHTML = `
    <summary>Projectile Surfaces</summary>
    <div class="level-editor__rules level-editor__projectile-skins">
      <div class="level-editor__properties">
        ${PROJECTILES.map(([assetId, label]) => `
          <label>${label}
            <select data-projectile-skin="${assetId}">
              ${PROJECTILE_SURFACE_IDS.map((surface) => `<option value="${surface}">${surface}</option>`).join("")}
            </select>
          </label>
        `).join("")}
      </div>
      <div class="level-editor__status">Chrome reflects the level environment; rubber, concrete and ceramic use dedicated PBR texture sets.</div>
      <div class="level-editor__entity-actions">
        <button id="editor-projectile-skins-apply" type="button" class="level-editor__primary">Apply Projectile Surfaces</button>
      </div>
    </div>
  `;
  if (scoringPanel) scoringPanel.insertAdjacentElement("beforebegin", section);
  else if (advancedJson) advancedJson.insertAdjacentElement("beforebegin", section);
  else panel.append(section);

  const selects = new Map<string, HTMLSelectElement>();
  for (const [assetId] of PROJECTILES) {
    const select = section.querySelector<HTMLSelectElement>(`[data-projectile-skin="${assetId}"]`)!;
    selects.set(assetId, select);
  }
  const status = panel.querySelector<HTMLElement>("#editor-status");

  const currentLevel = (): HappyBlocksLevel | null => {
    try {
      return JSON.parse(jsonText.value) as HappyBlocksLevel;
    } catch {
      return null;
    }
  };

  const sync = (): void => {
    const level = currentLevel();
    if (!level) return;
    for (const [assetId, select] of selects) {
      select.value = level.projectileSkins?.[assetId] ?? DEFAULTS[assetId];
      select.disabled = !Object.prototype.hasOwnProperty.call(level.inventory, assetId);
    }
  };

  section
    .querySelector<HTMLButtonElement>("#editor-projectile-skins-apply")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      level.projectileSkins = { ...(level.projectileSkins ?? {}) };
      for (const [assetId, select] of selects) {
        level.projectileSkins[assetId] = select.value as ProjectileSurface;
      }
      jsonText.value = `${JSON.stringify(level, null, 2)}\n`;
      applyJson.click();
      if (status) {
        status.textContent = "Projectile surface materials applied live.";
        status.dataset.state = "success";
      }
      sync();
    });

  new MutationObserver(sync).observe(entitySelect, { childList: true });
  jsonText.addEventListener("change", sync);
  sync();
}
