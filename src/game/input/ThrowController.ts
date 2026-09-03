import {
  ArcRotateCamera,
  Color3,
  LinesMesh,
  Matrix,
  Mesh,
  MeshBuilder,
  Observer,
  PhysicsAggregate,
  PhysicsBody,
  PointerEventTypes,
  PointerInfo,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { ASSETS } from "../AssetDefinitions";
import type { MaterialLibrary } from "../rendering/materials";
import type { VisualAssetLibrary } from "../rendering/VisualAssetLibrary";

export interface ThrowEvents {
  canThrow: () => boolean;
  getProjectileAsset: () => string;
  onAim: (power: number) => void;
  onThrow: (assetId: string) => void;
  onImpact: (assetId: string, impulse: number, point: Vector3) => void;
}

interface RuntimeProjectile {
  assetId: string;
  mesh: Mesh;
  aggregate: PhysicsAggregate;
  disposeVisual: () => void;
  lastImpactAt: number;
  pulseTriggered: boolean;
}

interface AimState {
  startX: number;
  startY: number;
  direction: Vector3;
}

export class ThrowController {
  private aim: AimState | null = null;
  private trajectory: LinesMesh | null = null;
  private readonly projectiles: RuntimeProjectile[] = [];
  private readonly keys = new Set<string>();
  private pointerObserver: Observer<PointerInfo> | null = null;
  private beforeRenderObserver: Observer<Scene> | null = null;
  private readonly reticle: HTMLElement;
  private readonly scoutHint: HTMLElement;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly materials: MaterialLibrary,
    private readonly events: ThrowEvents,
    private readonly visuals?: VisualAssetLibrary,
  ) {
    this.reticle = document.createElement("div");
    this.reticle.className = "aim-reticle";
    this.reticle.hidden = true;
    document.body.append(this.reticle);

    this.scoutHint = document.createElement("div");
    this.scoutHint.className = "scout-hint";
    this.scoutHint.textContent =
      "SCOUT  WASD move · Q/E height · Shift boost · RMB orbit · Wheel zoom · LMB pull/release";
    document.body.append(this.scoutHint);

    const camera = this.arcCamera();
    if (camera) {
      camera.lowerRadiusLimit = Math.min(camera.lowerRadiusLimit ?? 99, 1.35);
      camera.upperRadiusLimit = Math.max(camera.upperRadiusLimit ?? 0, 42);
      camera.panningSensibility = 75;
      camera.wheelPrecision = 38;
    }

    this.pointerObserver = scene.onPointerObservable.add((info) => {
      const event = info.event as PointerEvent;
      if (info.type === PointerEventTypes.POINTERDOWN && event.button === 0) {
        this.begin(event);
      } else if (info.type === PointerEventTypes.POINTERMOVE) {
        this.move(event);
      } else if (info.type === PointerEventTypes.POINTERUP && event.button === 0) {
        this.release(event);
      }
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.beforeRenderObserver = scene.onBeforeRenderObservable.add(() =>
      this.updateScoutNavigation(),
    );
  }

  getBodies(): PhysicsBody[] {
    return this.projectiles.map((projectile) => projectile.aggregate.body);
  }

  private arcCamera(): ArcRotateCamera | null {
    return this.scene.activeCamera instanceof ArcRotateCamera
      ? this.scene.activeCamera
      : null;
  }

  private begin(event: PointerEvent): void {
    if (!this.events.canThrow() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const camera = this.scene.activeCamera;
    if (!camera) {
      return;
    }

    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      Matrix.Identity(),
      camera,
    );
    this.aim = {
      startX: event.clientX,
      startY: event.clientY,
      direction: ray.direction.normalize(),
    };
    this.reticle.style.left = `${event.clientX}px`;
    this.reticle.style.top = `${event.clientY}px`;
    this.reticle.hidden = false;
    this.events.onAim(0);
    event.preventDefault();
  }

  private move(event: PointerEvent): void {
    if (!this.aim) {
      return;
    }
    const power = this.power(event);
    this.events.onAim(power);
    this.drawTrajectory(this.velocity(power, this.events.getProjectileAsset()));
  }

  private release(event: PointerEvent): void {
    if (!this.aim) {
      return;
    }
    const power = this.power(event);
    const assetId = this.events.getProjectileAsset();
    const velocity = this.velocity(power, assetId);
    this.aim = null;
    this.events.onAim(-1);
    this.reticle.hidden = true;
    this.disposeTrajectory();

    if (power < 0.07 || !this.events.canThrow()) {
      return;
    }
    this.spawn(velocity, assetId);
    this.events.onThrow(assetId);
  }

  private power(event: PointerEvent): number {
    if (!this.aim) return 0;
    const dx = event.clientX - this.aim.startX;
    const dy = event.clientY - this.aim.startY;
    const maxDrag = Math.min(330, Math.max(150, this.canvas.clientWidth * 0.28));
    return Math.min(Math.hypot(dx, dy) / maxDrag, 1);
  }

  private launchOrigin(direction: Vector3, radius: number): Vector3 {
    const camera = this.scene.activeCamera;
    const base = camera?.globalPosition ?? new Vector3(0, 1.6, -6);
    return base
      .add(direction.scale(Math.max(0.72, radius * 1.8)))
      .add(new Vector3(0, -0.16, 0));
  }

  private velocity(power: number, assetId: string): Vector3 {
    const direction =
      this.aim?.direction.clone() ??
      this.scene.activeCamera?.getForwardRay().direction.clone() ??
      Vector3.Forward();
    const speedFactor =
      assetId === "projectile.heavy" ? 0.86 : assetId === "projectile.pulse" ? 1.06 : 1;
    const speed = (8.5 + 20.5 * Math.pow(power, 1.16)) * speedFactor;
    direction.y += 0.035 + power * 0.07;
    return direction.normalize().scale(speed);
  }

  private spawn(velocity: Vector3, assetId: string): void {
    const definition = ASSETS[assetId];
    if (!definition || !["sphere", "capsule"].includes(definition.kind)) {
      throw new Error(`Unsupported projectile '${assetId}'`);
    }

    const mesh =
      definition.kind === "capsule"
        ? MeshBuilder.CreateCapsule(
            `projectile-${this.projectiles.length + 1}`,
            { height: definition.dimensions[1], radius: definition.radius! },
            this.scene,
          )
        : MeshBuilder.CreateSphere(
            `projectile-${this.projectiles.length + 1}`,
            { diameter: definition.radius! * 2, segments: 24 },
            this.scene,
          );
    mesh.position.copyFrom(this.launchOrigin(velocity.clone().normalize(), definition.radius ?? 0.4));

    const material =
      assetId === "projectile.heavy"
        ? this.materials.metal
        : assetId === "projectile.pulse"
          ? this.materials.energy
          : this.materials.projectile;
    mesh.material = material;

    const visual = this.visuals?.instantiate(
      definition.model,
      mesh,
      material,
      mesh.name,
    );
    if (visual) mesh.isVisible = false;

    const aggregate = new PhysicsAggregate(
      mesh,
      definition.physicsShape,
      { mass: definition.mass, friction: 0.3, restitution: 0.24 },
      this.scene,
    );
    aggregate.body.setLinearVelocity(velocity);
    aggregate.body.setAngularVelocity(
      new Vector3(velocity.y * 0.14, -velocity.x * 0.11, velocity.x * 0.09),
    );
    aggregate.body.setCollisionCallbackEnabled(true);

    const projectile: RuntimeProjectile = {
      assetId,
      mesh,
      aggregate,
      disposeVisual: visual?.dispose ?? (() => undefined),
      lastImpactAt: 0,
      pulseTriggered: false,
    };

    aggregate.body.getCollisionObservable().add((collision) => {
      const now = performance.now();
      const point = collision.point?.clone() ?? projectile.mesh.position.clone();

      if (
        assetId === "projectile.pulse" &&
        !projectile.pulseTriggered &&
        collision.impulse >= 0.65
      ) {
        projectile.pulseTriggered = true;
        this.events.onImpact(assetId, Math.max(2, collision.impulse), point);
        return;
      }
      if (collision.impulse < 0.3 || now - projectile.lastImpactAt < 85) return;
      projectile.lastImpactAt = now;
      this.events.onImpact(assetId, collision.impulse, point);
    });

    this.projectiles.push(projectile);
  }

  private drawTrajectory(velocity: Vector3): void {
    this.disposeTrajectory();
    const definition = ASSETS[this.events.getProjectileAsset()];
    const direction = velocity.clone().normalize();
    const origin = this.launchOrigin(direction, definition?.radius ?? 0.4);
    const points: Vector3[] = [];
    const gravity = new Vector3(0, -9.81, 0);

    for (let index = 0; index < 30; index += 1) {
      const time = index * 0.065;
      points.push(
        origin
          .add(velocity.scale(time))
          .add(gravity.scale(0.5 * time * time)),
      );
    }

    this.trajectory = MeshBuilder.CreateDashedLines(
      "trajectory",
      { points, dashSize: 0.16, gapSize: 0.1, dashNb: 120 },
      this.scene,
    );
    this.trajectory.color = new Color3(0.34, 0.93, 1);
    this.trajectory.alpha = 0.82;
    this.trajectory.isPickable = false;
  }

  private updateScoutNavigation(): void {
    if (this.aim) return;
    const camera = this.arcCamera();
    if (!camera || this.keys.size === 0) return;

    const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05);
    const forwardRay = camera.getForwardRay().direction;
    const forward = new Vector3(forwardRay.x, 0, forwardRay.z);
    if (forward.lengthSquared() < 0.001) forward.set(0, 0, 1);
    forward.normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const movement = Vector3.Zero();

    if (this.keys.has("KeyW")) movement.addInPlace(forward);
    if (this.keys.has("KeyS")) movement.subtractInPlace(forward);
    if (this.keys.has("KeyD")) movement.addInPlace(right);
    if (this.keys.has("KeyA")) movement.subtractInPlace(right);
    if (this.keys.has("KeyE")) movement.y += 1;
    if (this.keys.has("KeyQ")) movement.y -= 1;
    if (movement.lengthSquared() === 0) return;

    const boost =
      this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 3.0 : 1;
    const speed = Math.max(2.2, camera.radius * 0.36) * boost;
    movement.normalize().scaleInPlace(speed * dt);
    camera.target.addInPlace(movement);
    camera.target.y = Math.max(0.25, Math.min(camera.target.y, 18));
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      this.keys.add(event.code);
      if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
      }
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
  };

  private disposeTrajectory(): void {
    this.trajectory?.dispose();
    this.trajectory = null;
  }

  reset(): void {
    this.aim = null;
    this.reticle.hidden = true;
    this.disposeTrajectory();
    for (const projectile of this.projectiles) {
      projectile.disposeVisual();
      projectile.aggregate.dispose();
      projectile.mesh.dispose();
    }
    this.projectiles.length = 0;
  }

  dispose(): void {
    this.reset();
    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
    if (this.beforeRenderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
      this.beforeRenderObserver = null;
    }
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.reticle.remove();
    this.scoutHint.remove();
  }
}
