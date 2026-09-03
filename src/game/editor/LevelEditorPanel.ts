import type { HappyBlocksLevel, LevelEntity, LevelMode } from "../levels/types";
import { ASSETS } from "../AssetDefinitions";

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

export class LevelEditorPanel {
  private readonly toggleButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly entitySelect: HTMLSelectElement;
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
      <div id="editor-status" class="level-editor__status">Edit transforms or JSON, then Preview to rebuild physics.</div>
    `;
    document.body.append(this.panel);

    this.entitySelect = this.req("editor-entity") as HTMLSelectElement;
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

    this.toggleButton.addEventListener("click", this.toggle);
    this.entitySelect.addEventListener("change", this.syncTransformInputs);
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
    this.panel.hidden = !this.panel.hidden;
    this.toggleButton.dataset.active = String(!this.panel.hidden);
    if (!this.panel.hidden && this.working) {
      this.rebuildEntityOptions(this.entitySelect.value);
    }
  };

  close(): void {
    this.panel.hidden = true;
    this.toggleButton.dataset.active = "false";
  }

  dispose(): void {
    this.toggleButton.removeEventListener("click", this.toggle);
    this.entitySelect.removeEventListener("change", this.syncTransformInputs);
    Object.values(this.transformInputs).forEach((input) =>
      input.removeEventListener("change", this.onTransformChanged),
    );
    this.panel.removeEventListener("click", this.onPanelClick);
    this.fileInput.removeEventListener("change", this.onImportFile);
    this.toggleButton.remove();
    this.panel.remove();
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

  private readonly syncTransformInputs = (): void => {
    const entity = this.selectedEntity();
    const disabled = !entity;
    Object.values(this.transformInputs).forEach((input) => {
      input.disabled = disabled;
    });
    if (!entity) {
      return;
    }

    const [px, py, pz] = entity.position;
    const [rx, ry, rz] = entity.rotation ?? [0, 0, 0];
    const [sx, sy, sz] = entity.scale ?? [1, 1, 1];
    Object.assign(this.transformInputs.px, { valueAsNumber: px });
    Object.assign(this.transformInputs.py, { valueAsNumber: py });
    Object.assign(this.transformInputs.pz, { valueAsNumber: pz });
    Object.assign(this.transformInputs.rx, { valueAsNumber: rx });
    Object.assign(this.transformInputs.ry, { valueAsNumber: ry });
    Object.assign(this.transformInputs.rz, { valueAsNumber: rz });
    Object.assign(this.transformInputs.sx, { valueAsNumber: sx });
    Object.assign(this.transformInputs.sy, { valueAsNumber: sy });
    Object.assign(this.transformInputs.sz, { valueAsNumber: sz });
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
    this.jsonText.value = this.format(this.working!);
    this.setStatus("Transform changed · Preview to rebuild the physics scene.", "normal");
  };

  private parseJson(): boolean {
    try {
      const level = this.parseAndValidate(this.jsonText.value);
      this.working = this.clone(level);
      this.jsonText.value = this.format(this.working);
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
        this.jsonText.value = this.format(this.working);
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
    this.syncTransformInputs();
  }

  private selectedEntity(): LevelEntity | undefined {
    return this.working?.entities.find(
      (entity) => entity.id === this.entitySelect.value,
    );
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
    for (const entity of parsed.entities) {
      if (!entity.id || !entity.asset || !ASSETS[entity.asset]) {
        throw new Error(`Unknown or incomplete entity '${entity.id ?? "?"}'.`);
      }
    }
    return parsed as HappyBlocksLevel;
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
