export class Hud {
  private readonly level = this.req("level-name");
  private readonly shots = this.req("shots");
  private readonly score = this.req("score");
  private readonly status = this.req("status");
  private readonly powerWrap = this.req("power-wrap");
  private readonly powerBar = this.req("power-bar");

  readonly resetButton = this.req("reset-button") as HTMLButtonElement;

  setLevel(value: string): void {
    this.level.textContent = value;
  }

  setShots(value: number): void {
    this.shots.textContent = String(value);
  }

  setScore(value: number): void {
    this.score.textContent = Math.max(0, Math.round(value)).toLocaleString();
  }

  setStatus(text: string, state: "normal" | "win" = "normal"): void {
    this.status.textContent = text;
    this.status.dataset.state = state;
  }

  setPower(power: number): void {
    this.powerWrap.classList.toggle("is-visible", power >= 0);
    this.powerBar.style.width = `${Math.max(0, power) * 100}%`;
  }

  private req(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`#${id} was not found`);
    }

    return element;
  }
}
