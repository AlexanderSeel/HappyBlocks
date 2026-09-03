import type { HappyBlocksLevel } from "../levels/types";

function finite(input: HTMLInputElement, fallback: number): number {
  return Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : fallback;
}

export function installEditorScoringPanel(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const jsonText = panel?.querySelector<HTMLTextAreaElement>("#editor-json");
  const entitySelect = panel?.querySelector<HTMLSelectElement>("#editor-entity");
  const applyJson = panel?.querySelector<HTMLButtonElement>('[data-editor-action="parse"]');
  const levelSettings = panel?.querySelector<HTMLElement>("[data-editor-level-settings]");
  const advancedJson = panel?.querySelector<HTMLElement>(".level-editor__json");
  if (
    !panel ||
    !jsonText ||
    !entitySelect ||
    !applyJson ||
    panel.querySelector("[data-editor-scoring]")
  ) {
    return;
  }

  const section = document.createElement("details");
  section.className = "level-editor__json";
  section.dataset.editorScoring = "true";
  section.open = false;
  section.innerHTML = `
    <summary>Scoring & Stars</summary>
    <div class="level-editor__rules level-editor__scoring">
      <fieldset>
        <legend>Score model</legend>
        <label>Base<input id="editor-score-base" type="number" step="50" min="0"></label>
        <label>Projectile penalty<input id="editor-score-projectile" type="number" step="10" min="0"></label>
        <label>Time / sec<input id="editor-score-time" type="number" step="1" min="0"></label>
        <label>Combo window ms<input id="editor-score-window" type="number" step="50" min="50"></label>
        <label>Combo multiplier<input id="editor-score-multiplier" type="number" step="0.05" min="1"></label>
      </fieldset>
      <fieldset>
        <legend>Star thresholds</legend>
        <label>★ 1<input id="editor-star-1" type="number" step="50" min="0"></label>
        <label>★ 2<input id="editor-star-2" type="number" step="50" min="0"></label>
        <label>★ 3<input id="editor-star-3" type="number" step="50" min="0"></label>
      </fieldset>
      <div class="level-editor__entity-actions">
        <button id="editor-scoring-apply" type="button" class="level-editor__primary">Apply Scoring</button>
        <button id="editor-scoring-reset" type="button">Reset Optional Scoring</button>
      </div>
    </div>
  `;
  if (levelSettings) levelSettings.insertAdjacentElement("afterend", section);
  else if (advancedJson) advancedJson.insertAdjacentElement("beforebegin", section);
  else panel.append(section);

  const base = section.querySelector<HTMLInputElement>("#editor-score-base")!;
  const projectile = section.querySelector<HTMLInputElement>("#editor-score-projectile")!;
  const time = section.querySelector<HTMLInputElement>("#editor-score-time")!;
  const windowMs = section.querySelector<HTMLInputElement>("#editor-score-window")!;
  const multiplier = section.querySelector<HTMLInputElement>("#editor-score-multiplier")!;
  const star1 = section.querySelector<HTMLInputElement>("#editor-star-1")!;
  const star2 = section.querySelector<HTMLInputElement>("#editor-star-2")!;
  const star3 = section.querySelector<HTMLInputElement>("#editor-star-3")!;
  const status = panel.querySelector<HTMLElement>("#editor-status");

  const currentLevel = (): HappyBlocksLevel | null => {
    try {
      return JSON.parse(jsonText.value) as HappyBlocksLevel;
    } catch {
      return null;
    }
  };

  const writeOptional = (input: HTMLInputElement, value: number | undefined): void => {
    input.value = value === undefined ? "" : String(value);
  };

  const sync = (): void => {
    const level = currentLevel();
    if (!level) return;
    const scoring = level.scoring;
    writeOptional(base, scoring?.base);
    writeOptional(projectile, scoring?.projectilePenalty);
    writeOptional(time, scoring?.timePenaltyPerSecond);
    writeOptional(windowMs, scoring?.impactComboWindowMs);
    writeOptional(multiplier, scoring?.comboMultiplier);
    const thresholds = scoring?.starThresholds;
    writeOptional(star1, thresholds?.[0]);
    writeOptional(star2, thresholds?.[1]);
    writeOptional(star3, thresholds?.[2]);
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
    .querySelector<HTMLButtonElement>("#editor-scoring-apply")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      const scoring = { ...(level.scoring ?? {}) };

      const assignOptional = (
        input: HTMLInputElement,
        key:
          | "base"
          | "projectilePenalty"
          | "timePenaltyPerSecond"
          | "impactComboWindowMs"
          | "comboMultiplier",
        min: number,
      ): void => {
        if (!input.value.trim()) {
          delete scoring[key];
          return;
        }
        scoring[key] = Math.max(min, finite(input, min));
      };

      assignOptional(base, "base", 0);
      assignOptional(projectile, "projectilePenalty", 0);
      assignOptional(time, "timePenaltyPerSecond", 0);
      assignOptional(windowMs, "impactComboWindowMs", 50);
      assignOptional(multiplier, "comboMultiplier", 1);

      const starInputs = [star1, star2, star3];
      const hasAnyStar = starInputs.some((input) => input.value.trim());
      if (hasAnyStar) {
        const fallbackBase = scoring.base ?? 1000;
        const raw = [
          Math.max(0, finite(star1, fallbackBase * 0.45)),
          Math.max(0, finite(star2, fallbackBase * 0.7)),
          Math.max(0, finite(star3, fallbackBase * 0.9)),
        ].sort((a, b) => a - b);
        const first = Math.round(raw[0]);
        const second = Math.max(first + 1, Math.round(raw[1]));
        const third = Math.max(second + 1, Math.round(raw[2]));
        scoring.starThresholds = [first, second, third];
      } else {
        delete scoring.starThresholds;
      }

      if (Object.keys(scoring).length === 0) delete level.scoring;
      else level.scoring = scoring;
      commit(level, "Scoring and star thresholds applied live.");
    });

  section
    .querySelector<HTMLButtonElement>("#editor-scoring-reset")!
    .addEventListener("click", () => {
      const level = currentLevel();
      if (!level) return;
      delete level.scoring;
      commit(level, "Optional scoring overrides removed; runtime defaults will be used.");
    });

  const observer = new MutationObserver(sync);
  observer.observe(entitySelect, { childList: true });
  jsonText.addEventListener("change", sync);
  sync();
}
