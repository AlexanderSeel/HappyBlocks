import { ASSETS } from "../AssetDefinitions";
import type { HappyBlocksLevel, LevelEntity, LevelMode } from "../levels/types";
import { notifyEditorSelection } from "./editorEvents";

export interface LevelEditorCallbacks {
  onPreview: (level: HappyBlocksLevel) => Promise<void>;
  onRestore: () => Promise<void>;
}

type TransformInputKey =
  | "px"
  | "py"
  | "pz"
  | "rx"
  | "ry"
  | "rz"
  | "sx"
  | "sy"
  | "sz";

const LEVEL_MODES = new Set<LevelMode>([
  "throw",
  "chainReaction",
  "remove",
  "protect",
  "scoreAttack",
]);
const MATERIAL_IDS = [
  "wood",
  "stone",
  "metal",
  "rubber",
  "ceramic",
  "ceramic_cyan",
  "ceramic_amber",
  "ceramic_violet",
  "energy",
] as const;
const EDITOR_ASSET_IDS = Object.keys(ASSETS)
  .filter(
    (assetId) =>
      !assetId.startsWith("projectile.") && !assetId.startsWith("platform."),
  )
  .sort();

export class LevelEditorPanel {
  private readonly toggleButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly entitySelect: HTMLSelectElement;
  private readonly assetSelect: HTMLSelectElement;
  private readonly materialSelect: HTMLSelectElement;
  private readonly motionSelect: HTMLSelectElement;
  private readonly jsonText: HTMLTextAreaElement;
  private readonly fileInput: HTMLInputElement;
  private readonly status: HTMLElement;
  private readonly transformInputs: Record<TransformInputKey, HTMLInputElement>;
  private working: HappyBlocksLevel | null = null;
  private source: HappyBlocksLevel | null = null;

  constructor(private readonly callbacks: LevelEditorCallbacks) {
    const actions = document.querySelector<HTMLElement>(".hud__actions");
    if (!actions) {
      throw new Error(".hud__actions was not found");
    }

    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "editor-button";
    this.toggleButton.type = "button";
    this.toggleButton.textContent = "Editor";
    this.toggleButton.title = "Level editor · Ctrl+E";
    actions.append(this.toggleButton);

    this.panel = document.createElement("aside");
    this.panel.className = "level-editor";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "HappyBlocks level editor");
    this.panel.innerHTML = `
      <header class="level-editor__header">
        <div><small>DEVELOPER TOOL</small><strong>Level Editor</strong></div>
        <button type="button" data-editor-action="close" aria-label="Close editor">×</button>
      </header>
      <div class="level-editor__section">
        <label>Entity<select id="editor-entity"></select></label>
        <div class="level-editor__properties">
          <label>Asset<select id="editor-asset"></select></label>
          <label>Material<select id="editor-material"></select></label>
          <label>Motion<select id="editor-motion"><option value="DYNAMIC">Dynamic</option><option value="STATIC">Static</option></select></label>
        </div>
        <div class="level-editor__entity-actions">
          <button type="button" data-editor-action="add">+ Add</button>
          <button type="button" data-editor-action="duplicate">Duplicate</button>
          <button type="button" data-editor-action="delete" class="level-editor__danger">Delete</button>
        </div>
        <div class="level-editor__transform">
          <fieldset><legend>Position</legend><label>X<input id="editor-px" type="number" step="0.05"></label><label>Y<input id="editor-py" type="number" step="0.05"></label><label>Z<input id="editor-pz" type="number" step="0.05"></label></fieldset>
          <fieldset><legend>Rotation · rad</legend><label>X<input id="editor-rx" type="number" step="0.05"></label><label>Y<input id="editor-ry" type="number" step="0.05"></label><label>Z<input id="editor-rz" type="number" step="0.05"></label></fieldset>
          <fieldset><legend>Scale</legend><label>X<input id="editor-sx" type="number" step="0.05" min="0.05"></label><label>Y<input id="editor-sy" type="number" step="0.05" min="0.05"></label><label>Z<input id="editor-sz" type="number" step="0.05" min="0.05"></label></fieldset>
        </div>
      </div>
      <div class="level-editor__section level-editor__json">
        <label>Level JSON<textarea id="editor-json" spellcheck="false"></textarea></label>
      </div>
      <div class="level-editor__toolbar">
        <button type="button" data-editor-action="parse">Parse JSON</button>
        <button type="button" data-editor-action="preview" class="level-editor__primary">Preview</button>
        <button type="button" data-editor-action="import">Import</button>
        <button type="button" data-editor-action="export">Export</button>
        <button type="button" data-editor-action="restore">Restore</button>
      </div>
      <input id="editor-file" type="file" accept="application/json,.json" hidden>
      <div id="editor-status" class="level-editor__status">Edit the level, then Preview to rebuild physics.</div>
    `;
    document.body.append(this.panel);

    this.entitySelect = this.req("editor-entity") as HTMLSelectElement;
    this.assetSelect = this.req("editor-asset") as HTMLSelectElement;
    this.materialSelect = this.req("editor-material") as HTMLSelectElement;
    this.motionSelect = this.req("editor-motion") as HTMLSelectElement;
    this.jsonText = this.req("editor-json") as HTMLTextAreaElement;
    this.fileInput = this.req("editor-file") as HTMLInputElement;
    this.status = this.req("editor-status");
    this.transformInputs = {
      px: this.input("editor-px"),
      py: this.input("editor-py"),
      pz: this.input("editor-pz"),
      rx: this.input("editor-rx"),
      ry: this.input("editor-ry"),
      rz: this.input("editor-rz"),
      sx: this.input("editor-sx"),
      sy: this.input("editor-sy"),
      sz: this.input("editor-sz"),
    };

    this.populatePalette();
    this.toggleButton.addEventListener("click", this.toggle);
    this.entitySelect.addEventListener("change", this.syncEntityEditor);
    this.assetSelect.addEventListener("change", this.onPropertiesChanged);
    this.materialSelect.addEventListener("change", this.onPropertiesChanged);
    this.motionSelect.addEventListener("change", this.onPropertiesChanged);
    Object.values(this.transformInputs).forEach((input) =>
      input.addEventListener("change", this.onTransformChanged),
    );
    this.panel.addEventListener("click", this.onPanelClick);
    this.fileInput.addEventListener("change", this.onImportFile);
  }

  setLevel(level: HappyBlocksLevel): void {
    this.source = this.clone(level);
    this.working = this.clone(level);
    this.jsonText.value = this.format(this.working);
    this.rebuildEntityOptions();
    this.setStatus(`Loaded ${level.name}.`, "normal");
  }

  isOpen(): boolean {
    return !this.panel.hidden;
  }

  readonly toggle = (): void => {
    const opening = this.panel.hidden;
    this.panel.hidden = !opening;
    this.toggleButton.dataset.active = String(opening);
    if (opening && this.working) {
      this.rebuildEntityOptions(this.entitySelect.value);
    } else if (!opening) {
      notifyEditorSelection(null);
    }
  };

  close(): void {
    this.panel.hidden = true;
    this.toggleButton.dataset.active = "false";
    notifyEditorSelection(null);
  }

  dispose(): void {
    notifyEditorSelection(null);
    this.toggleButton.removeEventListener("click", this.toggle);
    this.entitySelect.removeEventListener("change", this.syncEntityEditor);
    this.assetSelect.removeEventListener("change", this.onPropertiesChanged);
    this.materialSelect.removeEventListener("change", this.onPropertiesChanged);
    this.motionSelect.removeEventListener("change", this.onPropertiesChanged);
    Object.values(this.transformInputs).forEach((input) =>
      input.removeEventListener("change", this.onTransformChanged),
    );
    this.panel.removeEventListener("click", this.onPanelClick);
    this.fileInput.removeEventListener("change", this.onImportFile);
    this.toggleButton.remove();
    this.panel.remove();
  }

  private populatePalette(): void {
    for (const assetId of EDITOR_ASSET_IDS) {
      const option = document.createElement("option");
      option.value = assetId;
      option.textContent = assetId;
      this.assetSelect.append(option);
    }
    for (const materialId of MATERIAL_IDS) {
      const option = document.createElement("option");
      option.value = materialId;
      option.textContent = materialId;
      this.materialSelect.append(option);
    }
  }

  private readonly onPanelClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-editor-action]",
    );
    const action = button?.dataset.editorAction;
    if (!action) {
      return;
    }

    if (action === "close") {
      this.close();
    } else if (action === "parse") {
      this.parseJson();
    } else if (action === "preview") {
      void this.preview();
    } else if (action === "import") {
      this.fileInput.click();
    } else if (action === "export") {
      this.exportJson();
    } else if (action === "restore") {
      void this.restore();
    } else if (action === "add") {
      this.addEntity();
    } else if (action === "duplicate") {
      this.duplicateEntity();
    } else if (action === "delete") {
      this.deleteEntity();
    }
  };

  private readonly onImportFile = (): void => {
    const file = this.fileInput.files?.[0];
    if (!file) {
      return;
    }
    void file
      .text()
      .then((text) => {
        this.jsonText.value = text;
        this.parseJson();
        this.setStatus(`Imported ${file.name}. Preview when ready.`, "success");
      })
      .catch((error: unknown) => this.setError(error));
    this.fileInput.value = "";
  };

  private readonly syncEntityEditor = (): void => {
    const entity = this.selectedEntity();
    const disabled = !entity;
    Object.values(this.transformInputs).forEach((input) => {
      input.disabled = disabled;
    });
    this.assetSelect.disabled = disabled;
    this.materialSelect.disabled = disabled;
    this.motionSelect.disabled = disabled;

    if (!entity) {
      notifyEditorSelection(null);
      return;
    }

    this.assetSelect.value = entity.asset;
    this.materialSelect.value = entity.material ?? this.defaultMaterial(entity.asset);
    this.motionSelect.value = entity.motion;
    const [px, py, pz] = entity.position;
    const [rx, ry, rz] = entity.rotation ?? [0, 0, 0];
    const [sx, sy, sz] = entity.scale ?? [1, 1, 1];
    this.transformInputs.px.valueAsNumber = px;
    this.transformInputs.py.valueAsNumber = py;
    this.transformInputs.pz.valueAsNumber = pz;
    this.transformInputs.rx.valueAsNumber = rx;
    this.transformInputs.ry.valueAsNumber = ry;
    this.transformInputs.rz.valueAsNumber = rz;
    this.transformInputs.sx.valueAsNumber = sx;
    this.transformInputs.sy.valueAsNumber = sy;
    this.transformInputs.sz.valueAsNumber = sz;
    notifyEditorSelection(entity.id);
  };

  private readonly onPropertiesChanged = (): void => {
    const entity = this.selectedEntity();
    if (!entity) {
      return;
    }
    entity.asset = this.assetSelect.value;
    entity.material = this.materialSelect.value;
    entity.motion = this.motionSelect.value === "STATIC" ? "STATIC" : "DYNAMIC";
    this.syncJsonFromWorking();
    this.setStatus("Entity properties changed · Preview to rebuild physics.", "normal");
  };

  private readonly onTransformChanged = (): void => {
    const entity = this.selectedEntity();
    if (!entity) {
      return;
    }

    entity.position = [
      this.number("px", entity.position[0]),
      this.number("py", entity.position[1]),
      this.number("pz", entity.position[2]),
    ];
    const rotation = entity.rotation ?? [0, 0, 0];
    entity.rotation = [
      this.number("rx", rotation[0]),
      this.number("ry", rotation[1]),
      this.number("rz", rotation[2]),
    ];
    const scale = entity.scale ?? [1, 1, 1];
    entity.scale = [
      Math.max(0.05, this.number("sx", scale[0])),
      Math.max(0.05, this.number("sy", scale[1])),
      Math.max(0.05, this.number("sz", scale[2])),
    ];
    this.syncJsonFromWorking();
    this.setStatus("Transform changed · Preview to rebuild the physics scene.", "normal");
  };

  private addEntity(): void {
    if (!this.working) {
      return;
    }
    const asset = this.assetSelect.value || EDITOR_ASSET_IDS[0];
    const entity: LevelEntity = {
      id: this.uniqueId(asset.replaceAll(".", "-")),
      asset,
      material: this.materialSelect.value || this.defaultMaterial(asset),
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      motion: this.motionSelect.value === "STATIC" ? "STATIC" : "DYNAMIC",
      tags: [],
    };
    this.working.entities.push(entity);
    this.syncJsonFromWorking();
    this.rebuildEntityOptions(entity.id);
    this.setStatus(`Added ${entity.id}. Preview to instantiate it.`, "success");
  }

  private duplicateEntity(): void {
    const source = this.selectedEntity();
    if (!source || !this.working) {
      return;
    }
    const copy = this.cloneEntity(source);
    copy.id = this.uniqueId(`${source.id}-copy`);
    copy.position = [source.position[0] + 0.35, source.position[1], source.position[2]];
    this.working.entities.push(copy);
    this.syncJsonFromWorking();
    this.rebuildEntityOptions(copy.id);
    this.setStatus(`Duplicated ${source.id} as ${copy.id}.`, "success");
  }

  private deleteEntity(): void {
    const entity = this.selectedEntity();
    if (!entity || !this.working) {
      return;
    }
    const index = this.working.entities.indexOf(entity);
    this.working.entities.splice(index, 1);
    notifyEditorSelection(null);
    this.syncJsonFromWorking();
    const next = this.working.entities[Math.min(index, this.working.entities.length - 1)];
    this.rebuildEntityOptions(next?.id);
    this.setStatus(`Deleted ${entity.id}. Preview to rebuild the scene.`, "success");
  }

  private parseJson(): boolean {
    try {
      const level = this.parseAndValidate(this.jsonText.value);
      this.working = this.clone(level);
      this.syncJsonFromWorking();
      this.rebuildEntityOptions(this.entitySelect.value);
      this.setStatus("JSON parsed successfully.", "success");
      return true;
    } catch (error) {
      this.setError(error);
      return false;
    }
  }

  private async preview(): Promise<void> {
    if (!this.parseJson() || !this.working) {
      return;
    }
    try {
      this.setStatus("Rebuilding physics preview…", "normal");
      await this.callbacks.onPreview(this.clone(this.working));
      notifyEditorSelection(this.entitySelect.value || null);
      this.setStatus("Preview active · editor results do not unlock progression.", "success");
    } catch (error) {
      this.setError(error);
    }
  }

  private async restore(): Promise<void> {
    try {
      this.setStatus("Restoring authored level…", "normal");
      await this.callbacks.onRestore();
      if (this.source) {
        this.working = this.clone(this.source);
        this.syncJsonFromWorking();
        this.rebuildEntityOptions();
      }
      this.setStatus("Authored level restored.", "success");
    } catch (error) {
      this.setError(error);
    }
  }

  private exportJson(): void {
    if (!this.parseJson() || !this.working) {
      return;
    }
    const blob = new Blob([this.format(this.working)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${this.working.id || "happyblocks-level"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.setStatus(`Exported ${anchor.download}.`, "success");
  }

  private rebuildEntityOptions(preferredId?: string): void {
    const entities = this.working?.entities ?? [];
    this.entitySelect.replaceChildren();
    for (const entity of entities) {
      const option = document.createElement("option");
      option.value = entity.id;
      option.textContent = `${entity.id} · ${entity.asset}`;
      this.entitySelect.append(option);
    }
    if (preferredId && entities.some((entity) => entity.id === preferredId)) {
      this.entitySelect.value = preferredId;
    }
    this.syncEntityEditor();
  }

  private selectedEntity(): LevelEntity | undefined {
    return this.working?.entities.find(
      (entity) => entity.id === this.entitySelect.value,
    );
  }

  private uniqueId(prefix: string): string {
    const ids = new Set(this.working?.entities.map((entity) => entity.id) ?? []);
    if (!ids.has(prefix)) {
      return prefix;
    }
    let index = 2;
    while (ids.has(`${prefix}-${index}`)) {
      index += 1;
    }
    return `${prefix}-${index}`;
  }

  private defaultMaterial(assetId: string): string {
    if (assetId.startsWith("goal.")) return "energy";
    if (assetId.startsWith("target.")) return "ceramic_violet";
    if (assetId.startsWith("bumper.")) return "rubber";
    if (assetId.startsWith("spinner.")) return "metal";
    if (assetId.startsWith("breakable.")) return "ceramic_cyan";
    return "wood";
  }

  private parseAndValidate(text: string): HappyBlocksLevel {
    const parsed = JSON.parse(text) as Partial<HappyBlocksLevel>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.mode !== "string" ||
      !LEVEL_MODES.has(parsed.mode as LevelMode) ||
      !parsed.arena ||
      !parsed.camera ||
      !parsed.inventory ||
      !Array.isArray(parsed.entities) ||
      !Array.isArray(parsed.objectives)
    ) {
      throw new Error("JSON is not a valid HappyBlocks level document.");
    }
    const ids = new Set<string>();
    for (const entity of parsed.entities) {
      if (!entity.id || !entity.asset || !ASSETS[entity.asset]) {
        throw new Error(`Unknown or incomplete entity '${entity.id ?? "?"}'.`);
      }
      if (ids.has(entity.id)) {
        throw new Error(`Duplicate entity id '${entity.id}'.`);
      }
      ids.add(entity.id);
    }
    return parsed as HappyBlocksLevel;
  }

  private syncJsonFromWorking(): void {
    if (this.working) {
      this.jsonText.value = this.format(this.working);
    }
  }

  private cloneEntity(entity: LevelEntity): LevelEntity {
    return JSON.parse(JSON.stringify(entity)) as LevelEntity;
  }

  private number(key: TransformInputKey, fallback: number): number {
    const value = this.transformInputs[key].valueAsNumber;
    return Number.isFinite(value) ? value : fallback;
  }

  private setError(error: unknown): void {
    this.setStatus(error instanceof Error ? error.message : String(error), "error");
  }

  private setStatus(text: string, state: "normal" | "success" | "error"): void {
    this.status.textContent = text;
    this.status.dataset.state = state;
  }

  private format(level: HappyBlocksLevel): string {
    return `${JSON.stringify(level, null, 2)}\n`;
  }

  private clone(level: HappyBlocksLevel): HappyBlocksLevel {
    return JSON.parse(JSON.stringify(level)) as HappyBlocksLevel;
  }

  private req(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`#${id} was not found`);
    }
    return element;
  }

  private input(id: string): HTMLInputElement {
    return this.req(id) as HTMLInputElement;
  }
}
