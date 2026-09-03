import { ASSETS } from "../AssetDefinitions";
import type { HappyBlocksLevel, LevelEntity, LevelMode } from "../levels/types";
import {
  EditorViewport,
  type EditorGizmoMode,
  type EditorTransform,
} from "./EditorViewport";
import {
  generateLevel,
  type GeneratorTemplate,
} from "./LevelGenerator";
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
const MAX_HISTORY = 60;
const ROTATION_SNAP = Math.PI / 12;

export class LevelEditorPanel {
  private readonly toggleButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly entitySelect: HTMLSelectElement;
  private readonly assetSelect: HTMLSelectElement;
  private readonly materialSelect: HTMLSelectElement;
  private readonly motionSelect: HTMLSelectElement;
  private readonly snapSelect: HTMLSelectElement;
  private readonly undoButton: HTMLButtonElement;
  private readonly redoButton: HTMLButtonElement;
  private readonly jsonText: HTMLTextAreaElement;
  private readonly fileInput: HTMLInputElement;
  private readonly status: HTMLElement;
  private readonly transformInputs: Record<TransformInputKey, HTMLInputElement>;
  private readonly generatorTemplate: HTMLSelectElement;
  private readonly generatorSeed: HTMLInputElement;
  private readonly generatorComplexity: HTMLInputElement;
  private readonly viewport: EditorViewport;
  private readonly historyPast: HappyBlocksLevel[] = [];
  private readonly historyFuture: HappyBlocksLevel[] = [];
  private historyGroupOpen = false;
  private historyGroupTimer: number | null = null;
  private gizmoMode: EditorGizmoMode = "position";
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
    this.toggleButton.textContent = "3D Editor";
    this.toggleButton.title = "Live 3D level editor · Ctrl+E";
    actions.append(this.toggleButton);

    this.panel = document.createElement("aside");
    this.panel.className = "level-editor";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "HappyBlocks live 3D level editor");
    this.panel.innerHTML = `
      <header class="level-editor__header">
        <div><small>LIVE BABYLON AUTHORING</small><strong>3D Level Editor</strong></div>
        <button type="button" data-editor-action="close" aria-label="Close editor">×</button>
      </header>
      <section class="level-editor__viewport-wrap">
        <canvas id="editor-viewport" class="level-editor__viewport" aria-label="Live 3D editor viewport"></canvas>
        <div class="level-editor__gizmos" aria-label="Transform gizmo mode">
          <button type="button" data-editor-gizmo="position" data-active="true">Move · W</button>
          <button type="button" data-editor-gizmo="rotation">Rotate · E</button>
          <button type="button" data-editor-gizmo="scale">Scale · S</button>
          <label class="level-editor__snap">Snap
            <select id="editor-snap" aria-label="Grid snap size">
              <option value="0">Off</option>
              <option value="0.05">0.05</option>
              <option value="0.1" selected>0.10</option>
              <option value="0.25">0.25</option>
              <option value="0.5">0.50</option>
              <option value="1">1.00</option>
            </select>
          </label>
        </div>
      </section>
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
      <section class="level-editor__generator">
        <div class="level-editor__section-title"><span>Procedural Generator</span><small>seeded + repeatable</small></div>
        <div class="level-editor__generator-grid">
          <label>Template<select id="editor-generator-template"><option value="tower">Tower</option><option value="bridge">Bridge</option><option value="domino">Domino Chain</option><option value="fortress">Fortress</option><option value="chaos">Physics Chaos</option></select></label>
          <label>Seed<input id="editor-generator-seed" type="text" value="happyblocks-001"></label>
          <label>Complexity<input id="editor-generator-complexity" type="range" min="1" max="8" step="1" value="4"></label>
          <button type="button" data-editor-action="generate" class="level-editor__primary">Generate Live</button>
        </div>
      </section>
      <details class="level-editor__json">
        <summary>Advanced JSON</summary>
        <label>Level JSON<textarea id="editor-json" spellcheck="false"></textarea></label>
      </details>
      <div class="level-editor__toolbar">
        <button id="editor-undo" type="button" data-editor-action="undo" title="Undo · Ctrl+Z">↶ Undo</button>
        <button id="editor-redo" type="button" data-editor-action="redo" title="Redo · Ctrl+Shift+Z / Ctrl+Y">↷ Redo</button>
        <button type="button" data-editor-action="parse">Apply JSON</button>
        <button type="button" data-editor-action="preview" class="level-editor__primary">▶ Physics Preview</button>
        <button type="button" data-editor-action="import">Import</button>
        <button type="button" data-editor-action="export">Export</button>
        <button type="button" data-editor-action="restore">Restore</button>
      </div>
      <input id="editor-file" type="file" accept="application/json,.json" hidden>
      <div id="editor-status" class="level-editor__status">Select objects directly in 3D and use the gizmos.</div>
    `;
    document.body.append(this.panel);

    this.entitySelect = this.req("editor-entity") as HTMLSelectElement;
    this.assetSelect = this.req("editor-asset") as HTMLSelectElement;
    this.materialSelect = this.req("editor-material") as HTMLSelectElement;
    this.motionSelect = this.req("editor-motion") as HTMLSelectElement;
    this.snapSelect = this.req("editor-snap") as HTMLSelectElement;
    this.undoButton = this.req("editor-undo") as HTMLButtonElement;
    this.redoButton = this.req("editor-redo") as HTMLButtonElement;
    this.jsonText = this.req("editor-json") as HTMLTextAreaElement;
    this.fileInput = this.req("editor-file") as HTMLInputElement;
    this.status = this.req("editor-status");
    this.generatorTemplate = this.req("editor-generator-template") as HTMLSelectElement;
    this.generatorSeed = this.req("editor-generator-seed") as HTMLInputElement;
    this.generatorComplexity = this.req("editor-generator-complexity") as HTMLInputElement;
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

    this.viewport = new EditorViewport(
      this.req("editor-viewport") as HTMLCanvasElement,
      {
        onSelection: (entityId) => this.selectEntity(entityId),
        onTransform: (entityId, transform) =>
          this.applyViewportTransform(entityId, transform),
      },
    );

    this.populatePalette();
    this.toggleButton.addEventListener("click", this.toggle);
    this.entitySelect.addEventListener("change", this.syncEntityEditor);
    this.assetSelect.addEventListener("change", this.onPropertiesChanged);
    this.materialSelect.addEventListener("change", this.onPropertiesChanged);
    this.motionSelect.addEventListener("change", this.onPropertiesChanged);
    Object.values(this.transformInputs).forEach((input) =>
      input.addEventListener("input", this.onTransformChanged),
    );
    this.panel.addEventListener("click", this.onPanelClick);
    this.fileInput.addEventListener("change", this.onImportFile);
    window.addEventListener("keydown", this.onEditorKeydown);
    this.updateHistoryButtons();
  }

  setLevel(level: HappyBlocksLevel): void {
    this.source = this.clone(level);
    this.working = this.clone(level);
    this.clearHistory();
    this.syncJsonFromWorking();
    this.rebuildEntityOptions();
    this.viewport.setLevel(this.working, this.entitySelect.value || null);
    this.setStatus(`Loaded ${level.name} into the live 3D editor.`, "normal");
  }

  isOpen(): boolean {
    return !this.panel.hidden;
  }

  readonly toggle = (): void => {
    const opening = this.panel.hidden;
    this.panel.hidden = !opening;
    this.toggleButton.dataset.active = String(opening);
    if (opening) {
      if (this.working) {
        this.viewport.setLevel(this.working, this.entitySelect.value || null);
      }
      requestAnimationFrame(() => this.viewport.resize());
      this.setStatus("Live edit mode · W move · E rotate · S scale · Ctrl+Z undo.", "success");
    } else {
      notifyEditorSelection(null);
    }
  };

  close(): void {
    this.panel.hidden = true;
    this.toggleButton.dataset.active = "false";
    notifyEditorSelection(null);
  }

  selectEntity(entityId: string | null): void {
    if (!entityId || !this.working?.entities.some((entity) => entity.id === entityId)) {
      return;
    }
    this.entitySelect.value = entityId;
    this.syncEntityEditor();
  }

  dispose(): void {
    notifyEditorSelection(null);
    if (this.historyGroupTimer !== null) {
      window.clearTimeout(this.historyGroupTimer);
    }
    this.toggleButton.removeEventListener("click", this.toggle);
    this.entitySelect.removeEventListener("change", this.syncEntityEditor);
    this.assetSelect.removeEventListener("change", this.onPropertiesChanged);
    this.materialSelect.removeEventListener("change", this.onPropertiesChanged);
    this.motionSelect.removeEventListener("change", this.onPropertiesChanged);
    Object.values(this.transformInputs).forEach((input) =>
      input.removeEventListener("input", this.onTransformChanged),
    );
    this.panel.removeEventListener("click", this.onPanelClick);
    this.fileInput.removeEventListener("change", this.onImportFile);
    window.removeEventListener("keydown", this.onEditorKeydown);
    this.viewport.dispose();
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
    const target = event.target as HTMLElement;
    const gizmo = target.closest<HTMLButtonElement>("[data-editor-gizmo]");
    if (gizmo?.dataset.editorGizmo) {
      this.setGizmoMode(gizmo.dataset.editorGizmo as EditorGizmoMode);
      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-editor-action]");
    const action = button?.dataset.editorAction;
    if (!action) return;
    if (action === "close") this.close();
    else if (action === "undo") this.undo();
    else if (action === "redo") this.redo();
    else if (action === "parse") this.parseJson();
    else if (action === "preview") void this.preview();
    else if (action === "import") this.fileInput.click();
    else if (action === "export") this.exportJson();
    else if (action === "restore") void this.restore();
    else if (action === "add") this.addEntity();
    else if (action === "duplicate") this.duplicateEntity();
    else if (action === "delete") this.deleteEntity();
    else if (action === "generate") this.generate();
  };

  private readonly onEditorKeydown = (event: KeyboardEvent): void => {
    if (!this.isOpen()) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      this.redo();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target as HTMLElement | null;
    if (target?.matches("input, textarea, select")) return;
    if (event.key.toLowerCase() === "w") this.setGizmoMode("position");
    else if (event.key.toLowerCase() === "e") this.setGizmoMode("rotation");
    else if (event.key.toLowerCase() === "s") this.setGizmoMode("scale");
  };

  private setGizmoMode(mode: EditorGizmoMode): void {
    this.gizmoMode = mode;
    this.viewport.setMode(mode);
    this.panel
      .querySelectorAll<HTMLButtonElement>("[data-editor-gizmo]")
      .forEach((button) => {
        button.dataset.active = String(button.dataset.editorGizmo === mode);
      });
    this.setStatus(`${mode[0].toUpperCase()}${mode.slice(1)} gizmo active.`, "normal");
  }

  private readonly onImportFile = (): void => {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    void file
      .text()
      .then((text) => {
        this.jsonText.value = text;
        if (this.parseJson()) {
          this.setStatus(`Imported ${file.name} into the live viewport.`, "success");
        }
      })
      .catch((error: unknown) => this.setError(error));
    this.fileInput.value = "";
  };

  private readonly syncEntityEditor = (): void => {
    const entity = this.selectedEntity();
    const disabled = !entity;
    Object.values(this.transformInputs).forEach((input) => (input.disabled = disabled));
    this.assetSelect.disabled = disabled;
    this.materialSelect.disabled = disabled;
    this.motionSelect.disabled = disabled;
    if (!entity) {
      notifyEditorSelection(null);
      this.viewport.select(null);
      return;
    }
    this.assetSelect.value = entity.asset;
    this.materialSelect.value = entity.material ?? this.defaultMaterial(entity.asset);
    this.motionSelect.value = entity.motion;
    this.writeTransformInputs(entity);
    this.viewport.select(entity.id);
    notifyEditorSelection(entity.id);
  };

  private readonly onPropertiesChanged = (): void => {
    const entity = this.selectedEntity();
    if (!entity || !this.working) return;
    this.checkpoint();
    entity.asset = this.assetSelect.value;
    entity.material = this.materialSelect.value;
    entity.motion = this.motionSelect.value === "STATIC" ? "STATIC" : "DYNAMIC";
    this.syncJsonFromWorking();
    this.viewport.setLevel(this.working, entity.id);
    this.setStatus("Entity rebuilt live with the new asset/material.", "success");
  };

  private readonly onTransformChanged = (): void => {
    const entity = this.selectedEntity();
    if (!entity) return;
    this.groupedCheckpoint();
    const transform = this.snapTransform(this.readTransformInputs(entity));
    this.applyTransformToEntity(entity, transform);
    this.writeTransformInputs(entity);
    this.syncJsonFromWorking();
    this.viewport.updateEntity(entity);
  };

  private applyViewportTransform(entityId: string, transform: EditorTransform): void {
    const entity = this.working?.entities.find((candidate) => candidate.id === entityId);
    if (!entity) return;
    this.groupedCheckpoint();
    const snapped = this.snapTransform(transform);
    this.applyTransformToEntity(entity, snapped);
    if (this.entitySelect.value === entityId) this.writeTransformInputs(entity);
    this.syncJsonFromWorking();
    this.viewport.updateEntity(entity);
  }

  private addEntity(): void {
    if (!this.working) return;
    this.checkpoint();
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
    this.viewport.setLevel(this.working, entity.id);
    this.setStatus(`Added ${entity.id} live.`, "success");
  }

  private duplicateEntity(): void {
    const source = this.selectedEntity();
    if (!source || !this.working) return;
    this.checkpoint();
    const copy = this.cloneEntity(source);
    copy.id = this.uniqueId(`${source.id}-copy`);
    copy.position = [source.position[0] + 0.45, source.position[1], source.position[2] + 0.15];
    this.working.entities.push(copy);
    this.syncJsonFromWorking();
    this.rebuildEntityOptions(copy.id);
    this.viewport.setLevel(this.working, copy.id);
    this.setStatus(`Duplicated ${source.id}.`, "success");
  }

  private deleteEntity(): void {
    const entity = this.selectedEntity();
    if (!entity || !this.working) return;
    this.checkpoint();
    const index = this.working.entities.indexOf(entity);
    this.working.entities.splice(index, 1);
    this.syncJsonFromWorking();
    const next = this.working.entities[Math.min(index, this.working.entities.length - 1)];
    this.rebuildEntityOptions(next?.id);
    this.viewport.setLevel(this.working, next?.id ?? null);
    this.setStatus(`Deleted ${entity.id}.`, "success");
  }

  private generate(): void {
    if (!this.working) return;
    try {
      this.checkpoint();
      const generated = generateLevel(this.working, {
        template: this.generatorTemplate.value as GeneratorTemplate,
        seed: this.generatorSeed.value.trim() || "happyblocks",
        complexity: Number(this.generatorComplexity.value),
      });
      this.working = generated;
      this.syncJsonFromWorking();
      this.rebuildEntityOptions();
      this.viewport.setLevel(generated, generated.entities[0]?.id ?? null);
      this.setStatus(
        `Generated ${generated.entities.length} entities live. Physics Preview when ready.`,
        "success",
      );
    } catch (error) {
      this.setError(error);
    }
  }

  private parseJson(): boolean {
    try {
      const level = this.parseAndValidate(this.jsonText.value);
      if (this.working) this.checkpoint();
      this.working = this.clone(level);
      this.syncJsonFromWorking();
      this.rebuildEntityOptions(this.entitySelect.value);
      this.viewport.setLevel(this.working, this.entitySelect.value || null);
      this.setStatus("JSON applied to the live 3D viewport.", "success");
      return true;
    } catch (error) {
      this.setError(error);
      return false;
    }
  }

  private async preview(): Promise<void> {
    if (!this.working) return;
    try {
      this.setStatus("Building Havok physics preview…", "normal");
      await this.callbacks.onPreview(this.clone(this.working));
      notifyEditorSelection(this.entitySelect.value || null);
      this.setStatus("Physics preview active behind the editor.", "success");
    } catch (error) {
      this.setError(error);
    }
  }

  private async restore(): Promise<void> {
    try {
      this.setStatus("Restoring authored level…", "normal");
      await this.callbacks.onRestore();
      if (this.source) {
        if (this.working) this.checkpoint();
        this.working = this.clone(this.source);
        this.syncJsonFromWorking();
        this.rebuildEntityOptions();
        this.viewport.setLevel(this.working);
      }
      this.setStatus("Authored level restored. Undo is available.", "success");
    } catch (error) {
      this.setError(error);
    }
  }

  private exportJson(): void {
    if (!this.working) return;
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

  private undo(): void {
    if (!this.working || this.historyPast.length === 0) return;
    this.endHistoryGroup();
    const previous = this.historyPast.pop();
    if (!previous) return;
    this.historyFuture.push(this.clone(this.working));
    this.working = previous;
    this.applyWorkingState(this.entitySelect.value);
    this.updateHistoryButtons();
    this.setStatus("Undo applied.", "success");
  }

  private redo(): void {
    if (!this.working || this.historyFuture.length === 0) return;
    this.endHistoryGroup();
    const next = this.historyFuture.pop();
    if (!next) return;
    this.historyPast.push(this.clone(this.working));
    this.working = next;
    this.applyWorkingState(this.entitySelect.value);
    this.updateHistoryButtons();
    this.setStatus("Redo applied.", "success");
  }

  private checkpoint(): void {
    if (!this.working) return;
    this.endHistoryGroup();
    this.pushPast(this.clone(this.working));
    this.historyFuture.splice(0);
    this.updateHistoryButtons();
  }

  private groupedCheckpoint(): void {
    if (!this.working) return;
    if (!this.historyGroupOpen) {
      this.pushPast(this.clone(this.working));
      this.historyFuture.splice(0);
      this.historyGroupOpen = true;
      this.updateHistoryButtons();
    }
    if (this.historyGroupTimer !== null) {
      window.clearTimeout(this.historyGroupTimer);
    }
    this.historyGroupTimer = window.setTimeout(() => {
      this.historyGroupOpen = false;
      this.historyGroupTimer = null;
    }, 300);
  }

  private endHistoryGroup(): void {
    this.historyGroupOpen = false;
    if (this.historyGroupTimer !== null) {
      window.clearTimeout(this.historyGroupTimer);
      this.historyGroupTimer = null;
    }
  }

  private pushPast(level: HappyBlocksLevel): void {
    this.historyPast.push(level);
    if (this.historyPast.length > MAX_HISTORY) this.historyPast.shift();
  }

  private clearHistory(): void {
    this.endHistoryGroup();
    this.historyPast.splice(0);
    this.historyFuture.splice(0);
    this.updateHistoryButtons();
  }

  private updateHistoryButtons(): void {
    this.undoButton.disabled = this.historyPast.length === 0;
    this.redoButton.disabled = this.historyFuture.length === 0;
  }

  private applyWorkingState(preferredId?: string): void {
    if (!this.working) return;
    this.syncJsonFromWorking();
    const fallback = this.working.entities[0]?.id;
    const selection = this.working.entities.some((entity) => entity.id === preferredId)
      ? preferredId
      : fallback;
    this.rebuildEntityOptions(selection);
    this.viewport.setLevel(this.working, selection ?? null);
  }

  private snapTransform(transform: EditorTransform): EditorTransform {
    const step = Number(this.snapSelect.value);
    if (!Number.isFinite(step) || step <= 0) {
      return {
        position: [...transform.position],
        rotation: [...transform.rotation],
        scale: [...transform.scale],
      };
    }
    const snap = (value: number, increment: number): number =>
      Math.round(value / increment) * increment;
    return {
      position: transform.position.map((value) => snap(value, step)) as [number, number, number],
      rotation: transform.rotation.map((value) => snap(value, ROTATION_SNAP)) as [number, number, number],
      scale: transform.scale.map((value) => Math.max(0.05, snap(value, step))) as [number, number, number],
    };
  }

  private applyTransformToEntity(entity: LevelEntity, transform: EditorTransform): void {
    entity.position = [...transform.position];
    entity.rotation = [...transform.rotation];
    entity.scale = [...transform.scale];
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

  private writeTransformInputs(entity: LevelEntity): void {
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
  }

  private readTransformInputs(entity: LevelEntity): EditorTransform {
    const rotation = entity.rotation ?? [0, 0, 0];
    const scale = entity.scale ?? [1, 1, 1];
    return {
      position: [
        this.number("px", entity.position[0]),
        this.number("py", entity.position[1]),
        this.number("pz", entity.position[2]),
      ],
      rotation: [
        this.number("rx", rotation[0]),
        this.number("ry", rotation[1]),
        this.number("rz", rotation[2]),
      ],
      scale: [
        Math.max(0.05, this.number("sx", scale[0])),
        Math.max(0.05, this.number("sy", scale[1])),
        Math.max(0.05, this.number("sz", scale[2])),
      ],
    };
  }

  private selectedEntity(): LevelEntity | undefined {
    return this.working?.entities.find((entity) => entity.id === this.entitySelect.value);
  }

  private uniqueId(prefix: string): string {
    const ids = new Set(this.working?.entities.map((entity) => entity.id) ?? []);
    if (!ids.has(prefix)) return prefix;
    let index = 2;
    while (ids.has(`${prefix}-${index}`)) index += 1;
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
      if (ids.has(entity.id)) throw new Error(`Duplicate entity id '${entity.id}'.`);
      ids.add(entity.id);
    }
    return parsed as HappyBlocksLevel;
  }

  private syncJsonFromWorking(): void {
    if (this.working) this.jsonText.value = this.format(this.working);
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
    if (!element) throw new Error(`#${id} was not found`);
    return element;
  }

  private input(id: string): HTMLInputElement {
    return this.req(id) as HTMLInputElement;
  }
}
