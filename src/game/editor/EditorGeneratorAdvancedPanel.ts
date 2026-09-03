import {
  DEFAULT_GENERATOR_TUNING,
  setGeneratorTuning,
  type GeneratorTuning,
} from "./GeneratorTuning";

const EXTRA_TEMPLATES = [
  ["pyramid", "Pyramid"],
  ["skyline", "Skyline"],
  ["pinball", "Physics Pinball"],
  ["spiral", "Spiral Collapse"],
  ["gauntlet", "Demolition Gauntlet"],
] as const;

type SliderKey = keyof GeneratorTuning;

const SLIDERS: Array<{
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}> = [
  { key: "footprint", label: "Footprint", min: 0.6, max: 1.8, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: "height", label: "Height", min: 0.55, max: 1.9, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: "density", label: "Density", min: 0.45, max: 1.65, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: "stability", label: "Start stability", min: 0.2, max: 1, step: 0.02, format: (v) => `${Math.round(v * 100)}%` },
  { key: "breakables", label: "Breakables", min: 0, max: 1, step: 0.02, format: (v) => `${Math.round(v * 100)}%` },
  { key: "mechanisms", label: "Mechanisms", min: 0, max: 1, step: 0.02, format: (v) => `${Math.round(v * 100)}%` },
  { key: "bumpers", label: "Bumpers", min: 0, max: 1, step: 0.02, format: (v) => `${Math.round(v * 100)}%` },
  { key: "symmetry", label: "Symmetry", min: 0, max: 1, step: 0.02, format: (v) => `${Math.round(v * 100)}%` },
];

export function installEditorGeneratorAdvancedPanel(): void {
  const panel = document.querySelector<HTMLElement>(".level-editor");
  const generator = panel?.querySelector<HTMLElement>(".level-editor__generator");
  const template = panel?.querySelector<HTMLSelectElement>("#editor-generator-template");
  const seed = panel?.querySelector<HTMLInputElement>("#editor-generator-seed");
  if (!panel || !generator || !template || !seed || generator.querySelector("[data-generator-advanced]")) {
    return;
  }

  for (const [value, label] of EXTRA_TEMPLATES) {
    if (template.querySelector(`option[value="${value}"]`)) continue;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    template.append(option);
  }

  const advanced = document.createElement("div");
  advanced.className = "level-editor__generator-advanced";
  advanced.dataset.generatorAdvanced = "true";
  advanced.innerHTML = `
    <div class="level-editor__section-title"><span>Shape & Physics Mix</span><small>live generator tuning</small></div>
    <div class="level-editor__slider-grid">
      ${SLIDERS.map(({ key, label, min, max, step }) => `
        <label class="level-editor__slider-control">
          <span>${label}<output id="editor-generator-${key}-value"></output></span>
          <input id="editor-generator-${key}" type="range" min="${min}" max="${max}" step="${step}">
        </label>
      `).join("")}
    </div>
    <div class="level-editor__entity-actions">
      <button id="editor-generator-randomize" type="button">New random seed</button>
      <button id="editor-generator-balanced" type="button">Balanced preset</button>
      <button id="editor-generator-chaotic" type="button">Chaos preset</button>
    </div>
  `;
  generator.append(advanced);

  const values = { ...DEFAULT_GENERATOR_TUNING };
  const syncStore = (): void => setGeneratorTuning(values);

  for (const slider of SLIDERS) {
    const input = advanced.querySelector<HTMLInputElement>(`#editor-generator-${slider.key}`)!;
    const output = advanced.querySelector<HTMLOutputElement>(`#editor-generator-${slider.key}-value`)!;
    const render = (): void => {
      const value = Number(input.value);
      values[slider.key] = Number.isFinite(value) ? value : DEFAULT_GENERATOR_TUNING[slider.key];
      output.value = slider.format(values[slider.key]);
      syncStore();
    };
    input.value = String(values[slider.key]);
    input.addEventListener("input", render);
    render();
  }

  const applyPreset = (preset: Partial<GeneratorTuning>): void => {
    Object.assign(values, preset);
    for (const slider of SLIDERS) {
      const input = advanced.querySelector<HTMLInputElement>(`#editor-generator-${slider.key}`)!;
      input.value = String(values[slider.key]);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  advanced.querySelector<HTMLButtonElement>("#editor-generator-randomize")!.addEventListener("click", () => {
    seed.value = `happyblocks-${Date.now().toString(36)}`;
  });
  advanced.querySelector<HTMLButtonElement>("#editor-generator-balanced")!.addEventListener("click", () => {
    applyPreset(DEFAULT_GENERATOR_TUNING);
  });
  advanced.querySelector<HTMLButtonElement>("#editor-generator-chaotic")!.addEventListener("click", () => {
    applyPreset({
      footprint: 1.25,
      height: 1.25,
      density: 1.2,
      stability: 0.52,
      breakables: 0.68,
      mechanisms: 0.62,
      bumpers: 0.55,
      symmetry: 0.25,
    });
  });
}
