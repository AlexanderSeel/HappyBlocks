import {
  Color3,
  LinesMesh,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsBody,
  PointerEventTypes,
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
  onImpact: (assetId: string, impulse: number) => void;
}

interface RuntimeProjectile {
  assetId: string;
  mesh: Mesh;
  aggregate: PhysicsAggregate;
  disposeVisual: () => void;
  lastImpactAt: number;
}

export class ThrowController {
  private dragStart: { x: number; y: number } | null = null;
  private trajectory: LinesMesh | null = null;
  private readonly launchOrigin = new Vector3(0, 1.55, -6.2);
  private readonly target = new Vector3(0, 1.65, 0);
  private readonly projectiles: RuntimeProjectile[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly materials: MaterialLibrary,
    private readonly events: ThrowEvents,
    private readonly visuals?: VisualAssetLibrary,
  ) {
    scene.onPointerObservable.add((info) => {
      const event = info.event as PointerEvent;
      if (info.type === PointerEventTypes.POINTERDOWN && event.button === 0) {
        this.begin(event);
      }
      if (info.type === PointerEventTypes.POINTERMOVE) {
        this.move(event);
      }
      if (info.type === PointerEventTypes.POINTERUP && event.button === 0) {
        this.release(event);
      }
    });
  }

  getBodies(): PhysicsBody[] {
    return this.projectiles.map((projectile) => projectile.aggregate.body);
  }

  private begin(event: PointerEvent): void {
    if (!this.events.canThrow()) {
      return;
    }

    this.dragStart = { x: event.clientX, y: event.clientY };
    this.events.onAim(0);
  }

  private move(event: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    const dx = this.dragStart.x - event.clientX;
    const dy = this.dragStart.y - event.clientY;
    const power = Math.min(
      Math.hypot(dx, dy) / Math.min(260, this.canvas.clientWidth * 0.34),
      1,
    );
    this.events.onAim(power);
    this.drawTrajectory(this.velocity(dx, dy, power));
  }

  private release(event: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    const dx = this.dragStart.x - event.clientX;
    const dy = this.dragStart.y - event.clientY;
    const power = Math.min(
      Math.hypot(dx, dy) / Math.min(260, this.canvas.clientWidth * 0.34),
      1,
    );

    this.dragStart = null;
    this.events.onAim(-1);
    this.disposeTrajectory();

    if (power < 0.08 || !this.events.canThrow()) {
      return;
    }

    const assetId = this.events.getProjectileAsset();
    this.spawn(this.velocity(dx, dy, power), assetId);
    this.events.onThrow(assetId);
  }

  private velocity(dx: number, dy: number, power: number): Vector3 {
    const base = this.target.subtract(this.launchOrigin).normalize();
    const lateral = dx / Math.max(this.canvas.clientWidth, 1);
    const vertical = dy / Math.max(this.canvas.clientHeight, 1);
    const direction = base
      .add(new Vector3(lateral * 3.4, vertical * 2.8 + 0.06, 0))
      .normalize();
    return direction.scale(7 + 15 * Math.pow(power, 1.25));
  }

  private spawn(velocity: Vector3, assetId: string): void {
    const definition = ASSETS[assetId];
    if (!definition || definition.kind !== "sphere") {
      throw new Error(`Unsupported projectile '${assetId}'`);
    }

    const mesh = MeshBuilder.CreateSphere(
      `projectile-${this.projectiles.length + 1}`,
      { diameter: definition.radius! * 2, segments: 20 },
      this.scene,
    );
    mesh.position.copyFrom(this.launchOrigin);

    const material =
      assetId === "projectile.heavy"
        ? this.materials.metal
        : this.materials.projectile;
    mesh.material = material;

    const visual = this.visuals?.instantiate(
      definition.model,
      mesh,
      material,
      mesh.name,
    );
    if (visual) {
      mesh.isVisible = false;
    }

    const aggregate = new PhysicsAggregate(
      mesh,
      definition.physicsShape,
      { mass: definition.mass, friction: 0.32, restitution: 0.22 },
      this.scene,
    );
    aggregate.body.setLinearVelocity(velocity);
    aggregate.body.setAngularVelocity(
      new Vector3(velocity.y * 0.12, -velocity.x * 0.12, velocity.x * 0.08),
    );
    aggregate.body.setCollisionCallbackEnabled(true);

    const projectile: RuntimeProjectile = {
      assetId,
      mesh,
      aggregate,
      disposeVisual: visual?.dispose ?? (() => undefined),
      lastImpactAt: 0,
    };

    aggregate.body.getCollisionObservable().add((collision) => {
      const now = performance.now();
      if (collision.impulse < 0.3 || now - projectile.lastImpactAt < 85) {
        return;
      }
      projectile.lastImpactAt = now;
      this.events.onImpact(assetId, collision.impulse);
    });

    this.projectiles.push(projectile);
  }

  private drawTrajectory(velocity: Vector3): void {
    this.disposeTrajectory();
    const points: Vector3[] = [];
    const gravity = new Vector3(0, -9.81, 0);

    for (let index = 0; index < 22; index += 1) {
      const time = index * 0.075;
      points.push(
        this.launchOrigin
          .add(velocity.scale(time))
          .add(gravity.scale(0.5 * time * time)),
      );
    }

    this.trajectory = MeshBuilder.CreateLines(
      "trajectory",
      { points },
      this.scene,
    );
    this.trajectory.color = new Color3(0.35, 0.92, 1);
    this.trajectory.alpha = 0.72;
    this.trajectory.isPickable = false;
  }

  private disposeTrajectory(): void {
    this.trajectory?.dispose();
    this.trajectory = null;
  }

  reset(): void {
    this.dragStart = null;
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
  }
}
