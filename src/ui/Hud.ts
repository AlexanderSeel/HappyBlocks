export interface ProjectileHudItem {
  id: string;
  label: string;
  count: number;
  keyHint: string;
}

export class Hud {
  private readonly level = this.req("level-name");
  private readonly resourceLabel = this.req("resource-label");
  private readonly shots = this.req("shots");
  private readonly score = this.req("score");
  private readonly combo = this.req("combo");
  private readonly status = this.req("status");
  private readonly powerWrap = this.req("power-wrap");
  private readonly powerBar = this.req("power-bar");
  private readonly projectileSelector = this.req("projectile-selector");
  private readonly resultPanel = this.req("result-panel");
  private readonly resultTitle = this.req("result-title");
  private readonly resultStars = this.req("result-stars");
  private readonly resultScore = this.req("result-score");
  readonly resetButton = this.req("reset-button") as HTMLButtonElement;
  readonly resultRetryButton = this.req("result-retry") as HTMLButtonElement;
  readonly resultNextButton = this.req("result-next") as HTMLButtonElement;

  setLevel(value: string): void {
    this.level.textContent = value;
  }

  setResourceLabel(value: string): void {
    this.resourceLabel.textContent = value;
  }

  setShots(value: number): void {
    this.shots.textContent = String(value);
  }

  setScore(value: number): void {
    this.score.textContent = Math.max(0, Math.round(value)).toLocaleString();
  }

  setCombo(value: number): void {
    this.combo.textContent = value > 1 ? `×${value}` : "—";
  }

  setStatus(
    text: string,
    state: "normal" | "win" | "fail" = "normal",
  ): void {
    this.status.textContent = text;
    this.status.dataset.state = state;
  }

  setPower(power: number): void {
    this.powerWrap.classList.toggle("is-visible", power >= 0);
    this.powerBar.style.width = `${Math.max(0, power) * 100}%`;
  }

  setProjectiles(
    items: ProjectileHudItem[],
    selectedId: string,
    onSelect: (id: string) => void,
  ): void {
    this.projectileSelector.replaceChildren();

    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "projectile-chip";
      button.dataset.active = String(item.id === selectedId);
      button.disabled = item.count <= 0;
      button.innerHTML = `<span>${item.keyHint}</span><strong>${item.label}</strong><em>×${item.count}</em>`;
      button.addEventListener("click", () => onSelect(item.id));
      this.projectileSelector.append(button);
    }
  }

  showResult(score: number, stars: number, hasNext: boolean): void {
    this.resultTitle.textContent = "LEVEL COMPLETE";
    this.resultScore.textContent = `${Math.round(score).toLocaleString()} POINTS`;
    this.resultStars.textContent = [0, 1, 2]
      .map((index) => (index < stars ? "★" : "☆"))
      .join(" ");
    this.resultNextButton.hidden = !hasNext;
    this.resultPanel.hidden = false;
  }

  showFailure(message: string): void {
    this.resultTitle.textContent = "LEVEL FAILED";
    this.resultStars.textContent = "✕";
    this.resultScore.textContent = message;
    this.resultNextButton.hidden = true;
    this.resultPanel.hidden = false;
  }

  hideResult(): void {
    this.resultPanel.hidden = true;
  }

  private req(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`#${id} was not found`);
    }
    return element;
  }
}
