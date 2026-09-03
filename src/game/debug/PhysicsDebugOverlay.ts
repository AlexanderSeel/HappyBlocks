import { Engine, PhysicsBody } from "@babylonjs/core";

export interface PhysicsDebugSnapshot {
  level: string;
  mode: string;
  bodies: PhysicsBody[];
  entities: number;
  projectiles: number;
  pendingBreaks: number;
  actionsRemaining: number;
  selectedProjectile: string;
}

export class PhysicsDebugOverlay {
  private readonly panel: HTMLElement;
  private readonly button: HTMLButtonElement;
  private enabled = false;
  private lastUpdate = 0;

  constructor(private readonly engine: Engine) {
    this.panel = this.req("debug-panel");
    this.button = this.req("debug-button") as HTMLButtonElement;
    this.button.addEventListener("click", this.toggle);
  }

  readonly toggle = (): void => {
    this.enabled = !this.enabled;
    this.panel.hidden = !this.enabled;
    this.button.dataset.active = String(this.enabled);
  };

  update(snapshot: PhysicsDebugSnapshot): void {
    if (!this.enabled || performance.now() - this.lastUpdate < 180) {
      return;
    }
    this.lastUpdate = performance.now();

    const moving = snapshot.bodies.filter(
      (body) =>
        body.getLinearVelocity().lengthSquared() > 0.02 ||
        body.getAngularVelocity().lengthSquared() > 0.04,
    ).length;

    this.panel.textContent = [
      "HAPPYBLOCKS PHYSICS DEBUG",
      `FPS              ${this.engine.getFps().toFixed(1)}`,
      `Level            ${snapshot.level}`,
      `Mode             ${snapshot.mode}`,
      `Entities         ${snapshot.entities}`,
      `Physics bodies   ${snapshot.bodies.length}`,
      `Moving bodies    ${moving}`,
      `Projectiles      ${snapshot.projectiles}`,
      `Pending breaks   ${snapshot.pendingBreaks}`,
      `Actions left     ${snapshot.actionsRemaining}`,
      `Projectile       ${snapshot.selectedProjectile || "—"}`,
    ].join("\n");
  }

  dispose(): void {
    this.button.removeEventListener("click", this.toggle);
  }

  private req(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`#${id} was not found`);
    }
    return element;
  }
}
