import type { HappyBlocksLevel, Vec3Tuple } from "../levels/types";
import {
  generateStructure,
  type StructureTemplate,
} from "./StructureGenerator";

const STRUCTURES: Array<{ id: StructureTemplate; label: string }> = [
  { id: "watchtower", label: "Watchtower" },
  { id: "gatehouse", label: "Gatehouse" },
  { id: "bridge-span", label: "Bridge Span" },
  { id: "rampart", label: "Rampart" },
  { id: "ricochet-station", label: "Ricochet Station" },
];

function uniquePrefix(level: HappyBlocksLevel, base: string): string {
  const ids = new Set(level.entities.map((entity) => entity.id));
  let index = 1;
  let prefix = base;
  while ([...ids].some((id) => id === prefix || id.startsWith(`${prefix}-`))) {
    index += 1;
    prefix = `${base}-${index}`;
  }
  return prefix;
}

function finiteNumber(input: HTMLInputElement | null, fallback: number): number {
  const value = input?.valueAsNumber;
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

/**
 * Adds reusable building modules to the existing editor without coupling the
 * structure library to the editor's private history/state implementation.
 * Applying JSON routes through the editor's normal validation + undo path.
 */
export function installEditorStructurePalette(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const generator = panel?.querySelector<HTMLElement>(".level-editor__generator");
  if (!panel || !generator || panel.querySelector("[data-structure-palette]")) {
    return;
  }

  const section = document.createElement("section");
  section.className = "level-editor__generator";
  section.dataset.structurePalette = "true";
  section.innerHTML = `
    <div class="level-editor__section-title">
      <span>Structure Palette</span>
      <small>anchor X/Z from selection · explicit base Y</small>
    </div>
    <div class="level-editor__generator-grid">
      <label>Module
        <select id="editor-structure-template">
          ${STRUCTURES.map((item) => `<option value="${item.id}">${item.label}</option>`).join("")}
        </select>
      </label>
      <label>Yaw
        <select id="editor-structure-yaw">
          <option value="0">0°</option>
          <option value="90">90°</option>
          <option value="180">180°</option>
          <option value="270">270°</option>
        </select>
      </label>
      <label>Base Y
        <input id="editor-structure-base-y" type="number" step="0.1" value="0">
      </label>
      <button id="editor-insert-structure" type="button" class="level-editor__primary">+ Insert Structure</button>
    </div>
  `;
  generator.insertAdjacentElement("afterend", section);

  const insertButton = section.querySelector<HTMLButtonElement>(
    "#editor-insert-structure",
  );
  const templateSelect = section.querySelector<HTMLSelectElement>(
    "#editor-structure-template",
  );
  const yawSelect = section.querySelector<HTMLSelectElement>(
    "#editor-structure-yaw",
  );
  const baseYInput = section.querySelector<HTMLInputElement>(
    "#editor-structure-base-y",
  );
  const jsonText = panel.querySelector<HTMLTextAreaElement>("#editor-json");
  const entitySelect = panel.querySelector<HTMLSelectElement>("#editor-entity");
  const applyButton = panel.querySelector<HTMLButtonElement>(
    '[data-editor-action="parse"]',
  );
  const status = panel.querySelector<HTMLElement>("#editor-status");

  insertButton?.addEventListener("click", () => {
    if (!jsonText || !templateSelect || !applyButton) return;
    try {
      const level = JSON.parse(jsonText.value) as HappyBlocksLevel;
      const selected = level.entities.find(
        (entity) => entity.id === entitySelect?.value,
      );
      const baseY = finiteNumber(baseYInput, 0);
      const anchor: Vec3Tuple = selected
        ? [selected.position[0], baseY, selected.position[2]]
        : [0, baseY, 0];
      const template = templateSelect.value as StructureTemplate;
      const yawDegrees = Number(yawSelect?.value ?? 0);
      const yaw = (Number.isFinite(yawDegrees) ? yawDegrees : 0) * Math.PI / 180;
      const prefix = uniquePrefix(level, `module-${template}`);
      const additions = generateStructure({ template, anchor, prefix, yaw });
      level.entities.push(...additions);
      jsonText.value = `${JSON.stringify(level, null, 2)}\n`;
      applyButton.click();

      const first = additions[0];
      if (first && entitySelect) {
        entitySelect.value = first.id;
        entitySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (status) {
        const anchorLabel = `${anchor[0].toFixed(2)}, ${anchor[1].toFixed(2)}, ${anchor[2].toFixed(2)}`;
        status.textContent = `Inserted ${additions.length} ${template} parts at ${anchorLabel} · yaw ${yawDegrees}°.`;
        status.dataset.state = "success";
      }
    } catch (error) {
      if (status) {
        status.textContent = error instanceof Error ? error.message : String(error);
        status.dataset.state = "error";
      }
    }
  });
}
