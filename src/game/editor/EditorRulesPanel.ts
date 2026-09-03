import type {
  HappyBlocksLevel,
  LevelEntity,
  LevelMode,
  LevelObjective,
} from "../levels/types";

const MODES: LevelMode[] = [
  "throw",
  "chainReaction",
  "remove",
  "protect",
  "scoreAttack",
];

function numberValue(input: HTMLInputElement | null, fallback: number): number {
  const value = input?.valueAsNumber;
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

export function installEditorRulesPanel(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const jsonText = panel?.querySelector<HTMLTextAreaElement>("#editor-json");
  const entitySelect = panel?.querySelector<HTMLSelectElement>("#editor-entity");
  const applyButton = panel?.querySelector<HTMLButtonElement>(
    '[data-editor-action="parse"]',
  );
  if (
    !panel ||
    !jsonText ||
    !entitySelect ||
    !applyButton ||
    panel.querySelector("[data-editor-rules]")
  ) {
    return;
  }

  const advancedJson = panel.querySelector<HTMLElement>(".level-editor__json");
  const section = document.createElement("details");
  section.className = "level-editor__json";
  section.dataset.editorRules = "true";
  section.open = true;
  section.innerHTML = `
    <summary>Gameplay & Physics</summary>
    <div class="level-editor__rules">
      <div class="level-editor__properties">
        <label>Mode
          <select id="editor-rule-mode">
            ${MODES.map((mode) => `<option value="${mode}">${mode}</option>`).join("")}
          </select>
        </label>
        <label>Standard shots<input id="editor-rule-standard" type="number" min="0" step="1"></label>
        <label>Heavy shots<input id="editor-rule-heavy" type="number" min="0" step="1"></label>
        <label>Pulse shots<input id="editor-rule-pulse" type="number" min="0" step="1"></label>
        <label>Remove pulls<input id="editor-rule-removes" type="number" min="0" step="1"></label>
      </div>
      <fieldset>
        <legend>Selected entity physics</legend>
        <label>Tags<input id="editor-rule-tags" type="text" placeholder="target, breakable, wall"></label>
        <label>Mass scale<input id="editor-rule-mass" type="number" min="0.05" step="0.05"></label>
        <label>Break threshold<input id="editor-rule-break" type="number" min="0" step="0.1" placeholder="none"></label>
      </fieldset>
      <div class="level-editor__entity-actions">
        <button id="editor-rule-apply" type="button" class="level-editor__primary">Apply Rules</button>
      </div>
      <fieldset>
        <legend>Objective builder</legend>
        <label>Type
          <select id="editor-objective-type">
            <option value="knockDown">Knock down</option>
            <option value="moveBelowY">Move below Y</option>
            <option value="protect">Protect</option>
            <option value="removed">Removed</option>
          </select>
        </label>
        <label>Target tag<input id="editor-objective-tag" type="text" value="target"></label>
        <label>Threshold<input id="editor-objective-value" type="number" step="0.05" value="0.52"></label>
        <label>Required<input id="editor-objective-required" type="number" min="1" step="1" value="1"></label>
        <div class="level-editor__entity-actions">
          <button id="editor-objective-add" type="button">+ Add Objective</button>
          <button id="editor-objective-clear" type="button" class="level-editor__danger">Clear Objectives</button>
        </div>
      </fieldset>
      <div id="editor-objective-summary" class="level-editor__status"></div>
    </div>
  `;
  if (advancedJson) advancedJson.insertAdjacentElement("beforebegin", section);
  else panel.append(section);

  const mode = section.querySelector<HTMLSelectElement>("#editor-rule-mode")!;
  const standard = section.querySelector<HTMLInputElement>("#editor-rule-standard")!;
  const heavy = section.querySelector<HTMLInputElement>("#editor-rule-heavy")!;
  const pulse = section.querySelector<HTMLInputElement>("#editor-rule-pulse")!;
  const removes = section.querySelector<HTMLInputElement>("#editor-rule-removes")!;
  const tags = section.querySelector<HTMLInputElement>("#editor-rule-tags")!;
  const mass = section.querySelector<HTMLInputElement>("#editor-rule-mass")!;
  const breakThreshold = section.querySelector<HTMLInputElement>("#editor-rule-break")!;
  const objectiveType = section.querySelector<HTMLSelectElement>("#editor-objective-type")!;
  const objectiveTag = section.querySelector<HTMLInputElement>("#editor-objective-tag")!;
  const objectiveValue = section.querySelector<HTMLInputElement>("#editor-objective-value")!;
  const objectiveRequired = section.querySelector<HTMLInputElement>("#editor-objective-required")!;
  const summary = section.querySelector<HTMLElement>("#editor-objective-summary")!;

  const currentLevel = (): HappyBlocksLevel | null => {
    try {
      return JSON.parse(jsonText.value) as HappyBlocksLevel;
    } catch {
      return null;
    }
  };

  const selectedEntity = (level: HappyBlocksLevel): LevelEntity | undefined =>
    level.entities.find((entity) => entity.id === entitySelect.value);

  const summarize = (level: HappyBlocksLevel): void => {
    summary.textContent =
      level.objectives.length === 0
        ? "No objectives yet."
        : level.objectives
            .map((objective, index) => {
              const targetTag = "targetTag" in objective ? objective.targetTag : "?";
              return `${index + 1}. ${objective.type} · ${targetTag}`;
            })
            .join("   |   ");
  };

  const sync = (): void => {
    const level = currentLevel();
    if (!level) return;
    mode.value = level.mode;
    standard.valueAsNumber = level.inventory["projectile.ball"] ?? 0;
    heavy.valueAsNumber = level.inventory["projectile.heavy"] ?? 0;
    pulse.valueAsNumber = level.inventory["projectile.pulse"] ?? 0;
    removes.valueAsNumber = level.actions?.removes ?? 0;
    const entity = selectedEntity(level);
    tags.value = entity?.tags?.join(", ") ?? "";
    mass.value = entity?.massScale === undefined ? "" : String(entity.massScale);
    breakThreshold.value =
      entity?.breakThreshold === undefined ? "" : String(entity.breakThreshold);
    summarize(level);
  };

  const commit = (level: HappyBlocksLevel): void => {
    jsonText.value = `${JSON.stringify(level, null, 2)}\n`;
    applyButton.click();
    sync();
  };

  section
    .querySelector<HTMLButtonElement>("#editor-rule-apply")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      level.mode = mode.value as LevelMode;
      level.inventory["projectile.ball"] = Math.max(
        0,
        Math.round(numberValue(standard, 0)),
      );
      level.inventory["projectile.heavy"] = Math.max(
        0,
        Math.round(numberValue(heavy, 0)),
      );
      level.inventory["projectile.pulse"] = Math.max(
        0,
        Math.round(numberValue(pulse, 0)),
      );

      const pullCount = Math.max(0, Math.round(numberValue(removes, 0)));
      if (pullCount > 0) {
        level.actions = { ...(level.actions ?? {}), removes: pullCount };
      } else if (level.actions) {
        delete level.actions.removes;
        if (Object.keys(level.actions).length === 0) delete level.actions;
      }

      const entity = selectedEntity(level);
      if (entity) {
        entity.tags = tags.value
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const massValue = Number(mass.value);
        if (Number.isFinite(massValue) && massValue > 0) entity.massScale = massValue;
        else delete entity.massScale;
        const breakValue = Number(breakThreshold.value);
        if (
          breakThreshold.value.trim() &&
          Number.isFinite(breakValue) &&
          breakValue >= 0
        ) {
          entity.breakThreshold = breakValue;
        } else {
          delete entity.breakThreshold;
        }
      }
      commit(level);
    });

  section
    .querySelector<HTMLButtonElement>("#editor-objective-add")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      const type = objectiveType.value;
      const targetTag = objectiveTag.value.trim() || "target";
      const required = Math.max(
        1,
        Math.round(numberValue(objectiveRequired, 1)),
      );
      const value = numberValue(objectiveValue, 0.52);
      let objective: LevelObjective;
      if (type === "moveBelowY") {
        objective = { type, targetTag, y: value, required };
      } else if (type === "protect") {
        objective = {
          type,
          targetTag,
          minY: value,
          minUpDot: 0.35,
          required,
        };
      } else if (type === "removed") {
        objective = { type, targetTag, required };
      } else {
        objective = {
          type: "knockDown",
          targetTag,
          maxUpDot: value,
          required,
        };
      }
      level.objectives.push(objective);
      commit(level);
    });

  section
    .querySelector<HTMLButtonElement>("#editor-objective-clear")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      level.objectives = [];
      commit(level);
    });

  entitySelect.addEventListener("change", sync);
  jsonText.addEventListener("change", sync);
  sync();
}
