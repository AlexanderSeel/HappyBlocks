import type { HappyBlocksLevel, Vec3Tuple } from "../levels/types";

function finite(input: HTMLInputElement | null, fallback: number): number {
  const value = input?.valueAsNumber;
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function vec3(
  x: HTMLInputElement,
  y: HTMLInputElement,
  z: HTMLInputElement,
  fallback: Vec3Tuple,
): Vec3Tuple {
  return [finite(x, fallback[0]), finite(y, fallback[1]), finite(z, fallback[2])];
}

export function installEditorLevelSettingsPanel(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const jsonText = panel?.querySelector<HTMLTextAreaElement>("#editor-json");
  const entitySelect = panel?.querySelector<HTMLSelectElement>("#editor-entity");
  const applyJson = panel?.querySelector<HTMLButtonElement>('[data-editor-action="parse"]');
  const rulesPanel = panel?.querySelector<HTMLElement>("[data-editor-rules]");
  const advancedJson = panel?.querySelector<HTMLElement>(".level-editor__json");
  if (
    !panel ||
    !jsonText ||
    !entitySelect ||
    !applyJson ||
    panel.querySelector("[data-editor-level-settings]")
  ) {
    return;
  }

  const section = document.createElement("details");
  section.className = "level-editor__json";
  section.dataset.editorLevelSettings = "true";
  section.open = false;
  section.innerHTML = `
    <summary>Level, Arena & Camera</summary>
    <div class="level-editor__rules level-editor__level-settings">
      <div class="level-editor__properties level-editor__level-meta">
        <label>Level ID<input id="editor-level-id" type="text"></label>
        <label>Name<input id="editor-level-name" type="text"></label>
        <label>Platform
          <select id="editor-level-platform">
            <option value="platform.square">Square</option>
            <option value="platform.round">Round</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Gravity</legend>
        <label>X<input id="editor-gravity-x" type="number" step="0.1"></label>
        <label>Y<input id="editor-gravity-y" type="number" step="0.1"></label>
        <label>Z<input id="editor-gravity-z" type="number" step="0.1"></label>
      </fieldset>
      <fieldset>
        <legend>Camera target</legend>
        <label>X<input id="editor-camera-x" type="number" step="0.1"></label>
        <label>Y<input id="editor-camera-y" type="number" step="0.1"></label>
        <label>Z<input id="editor-camera-z" type="number" step="0.1"></label>
        <div class="level-editor__entity-actions">
          <button id="editor-camera-target-selection" type="button">Target selected entity</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Camera orbit</legend>
        <label>Alpha<input id="editor-camera-alpha" type="number" step="0.05"></label>
        <label>Beta<input id="editor-camera-beta" type="number" step="0.05" min="0.05" max="3.09"></label>
        <label>Radius<input id="editor-camera-radius" type="number" step="0.1" min="0.2"></label>
        <label>Min radius<input id="editor-camera-min" type="number" step="0.1" min="0.2"></label>
        <label>Max radius<input id="editor-camera-max" type="number" step="0.1" min="0.2"></label>
      </fieldset>
      <div class="level-editor__entity-actions">
        <button id="editor-level-settings-apply" type="button" class="level-editor__primary">Apply Level Settings</button>
      </div>
    </div>
  `;
  if (rulesPanel) rulesPanel.insertAdjacentElement("afterend", section);
  else if (advancedJson) advancedJson.insertAdjacentElement("beforebegin", section);
  else panel.append(section);

  const id = section.querySelector<HTMLInputElement>("#editor-level-id")!;
  const name = section.querySelector<HTMLInputElement>("#editor-level-name")!;
  const platform = section.querySelector<HTMLSelectElement>("#editor-level-platform")!;
  const gx = section.querySelector<HTMLInputElement>("#editor-gravity-x")!;
  const gy = section.querySelector<HTMLInputElement>("#editor-gravity-y")!;
  const gz = section.querySelector<HTMLInputElement>("#editor-gravity-z")!;
  const cx = section.querySelector<HTMLInputElement>("#editor-camera-x")!;
  const cy = section.querySelector<HTMLInputElement>("#editor-camera-y")!;
  const cz = section.querySelector<HTMLInputElement>("#editor-camera-z")!;
  const alpha = section.querySelector<HTMLInputElement>("#editor-camera-alpha")!;
  const beta = section.querySelector<HTMLInputElement>("#editor-camera-beta")!;
  const radius = section.querySelector<HTMLInputElement>("#editor-camera-radius")!;
  const minRadius = section.querySelector<HTMLInputElement>("#editor-camera-min")!;
  const maxRadius = section.querySelector<HTMLInputElement>("#editor-camera-max")!;
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
    id.value = level.id;
    name.value = level.name;
    platform.value = level.arena.platform;
    [gx.valueAsNumber, gy.valueAsNumber, gz.valueAsNumber] = level.arena.gravity;
    [cx.valueAsNumber, cy.valueAsNumber, cz.valueAsNumber] = level.camera.target;
    alpha.valueAsNumber = level.camera.alpha;
    beta.valueAsNumber = level.camera.beta;
    radius.valueAsNumber = level.camera.radius;
    minRadius.value = level.camera.minRadius === undefined ? "" : String(level.camera.minRadius);
    maxRadius.value = level.camera.maxRadius === undefined ? "" : String(level.camera.maxRadius);
  };

  const commit = (level: HappyBlocksLevel, message: string): void => {
    jsonText.value = `${JSON.stringify(level, null, 2)}\n`;
    applyJson.click();
    if (status) {
      status.textContent = message;
      status.dataset.state = "success";
    }
    sync();
  };

  section
    .querySelector<HTMLButtonElement>("#editor-camera-target-selection")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      const selected = level.entities.find((entity) => entity.id === entitySelect.value);
      if (!selected) return;
      [cx.valueAsNumber, cy.valueAsNumber, cz.valueAsNumber] = selected.position;
      level.camera.target = [...selected.position];
      commit(level, `Camera target moved to ${selected.id}.`);
    });

  section
    .querySelector<HTMLButtonElement>("#editor-level-settings-apply")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      const nextId = id.value.trim();
      const nextName = name.value.trim();
      if (!nextId || !nextName) {
        if (status) {
          status.textContent = "Level ID and name cannot be empty.";
          status.dataset.state = "error";
        }
        return;
      }

      level.id = nextId;
      level.name = nextName;
      level.arena.platform = platform.value;
      level.arena.gravity = vec3(gx, gy, gz, level.arena.gravity);
      level.camera.target = vec3(cx, cy, cz, level.camera.target);
      level.camera.alpha = finite(alpha, level.camera.alpha);
      level.camera.beta = Math.min(3.09, Math.max(0.05, finite(beta, level.camera.beta)));
      level.camera.radius = Math.max(0.2, finite(radius, level.camera.radius));

      const min = Number(minRadius.value);
      const max = Number(maxRadius.value);
      if (minRadius.value.trim() && Number.isFinite(min) && min > 0) level.camera.minRadius = min;
      else delete level.camera.minRadius;
      if (maxRadius.value.trim() && Number.isFinite(max) && max > 0) level.camera.maxRadius = max;
      else delete level.camera.maxRadius;
      if (
        level.camera.minRadius !== undefined &&
        level.camera.maxRadius !== undefined &&
        level.camera.minRadius > level.camera.maxRadius
      ) {
        [level.camera.minRadius, level.camera.maxRadius] = [
          level.camera.maxRadius,
          level.camera.minRadius,
        ];
      }
      level.camera.radius = Math.max(
        level.camera.minRadius ?? 0.2,
        Math.min(level.camera.radius, level.camera.maxRadius ?? Number.POSITIVE_INFINITY),
      );
      commit(level, "Level, arena and camera settings applied live.");
    });

  const observer = new MutationObserver(sync);
  observer.observe(entitySelect, { childList: true });
  jsonText.addEventListener("change", sync);
  sync();
}
