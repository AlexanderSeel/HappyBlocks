import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  ShadowGenerator,
  Vector3,
} from "@babylonjs/core";
import { ArcRotateCameraPointersInput } from "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import { AudioFx } from "./AudioFx";
import { BlockFactory, type RuntimeEntity } from "./BlockFactory";
import { ThrowController } from "./input/ThrowController";
import { loadLevel } from "./levels/loadLevel";
import type { HappyBlocksLevel, LevelObjective } from "./levels/types";
import { initPhysics } from "./physics/initPhysics";
import {
  createMaterialLibrary,
  type MaterialLibrary,
} from "./rendering/materials";
import { Hud } from "../ui/Hud";

export class HappyBlocksGame {
  private readonly engine: Engine;
  private readonly hud = new Hud();
  private readonly audio = new AudioFx();

  private scene: Scene | null = null;
  private materials: MaterialLibrary | null = null;
  private level: HappyBlocksLevel | null = null;
  private entities: RuntimeEntity[] = [];
  private platform: { mesh: Mesh; aggregate: PhysicsAggregate } | null = null;
  private throwController: ThrowController | null = null;
  private shotsRemaining = 0;
  private shotsUsed = 0;
  private startedAt = 0;
  private completed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
    });

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keydown);
    this.hud.resetButton.addEventListener("click", () => void this.reset());
  }

  async start(levelUrl: string): Promise<void> {
    this.level = await loadLevel(levelUrl);
    await this.buildScene(this.level);

    this.engine.runRenderLoop(() => {
      if (!this.scene) {
        return;
      }

      this.update();
      this.scene.render();
    });
  }

  private async buildScene(level: HappyBlocksLevel): Promise<void> {
    this.scene?.dispose();

    const scene = new Scene(this.engine);
    this.scene = scene;
    scene.clearColor = new Color4(0.018, 0.055, 0.068, 1);
    scene.ambientColor = new Color3(0.08, 0.12, 0.14);

    await initPhysics(scene, Vector3.FromArray(level.arena.gravity));

    const camera = new ArcRotateCamera(
      "camera",
      level.camera.alpha,
      level.camera.beta,
      level.camera.radius,
      Vector3.FromArray(level.camera.target),
      scene,
    );
    camera.lowerRadiusLimit = level.camera.minRadius ?? 6;
    camera.upperRadiusLimit = level.camera.maxRadius ?? 20;
    camera.lowerBetaLimit = 0.55;
    camera.upperBetaLimit = 1.45;
    camera.wheelPrecision = 32;
    camera.attachControl(this.canvas, true);

    const pointerInput = camera.inputs.attached.pointers;
    if (pointerInput instanceof ArcRotateCameraPointersInput) {
      pointerInput.buttons = [1, 2];
    }

    const hemi = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;
    hemi.groundColor = new Color3(0.08, 0.12, 0.14);

    const key = new DirectionalLight(
      "key",
      new Vector3(-0.45, -1, 0.35),
      scene,
    );
    key.position = new Vector3(7, 12, -8);
    key.intensity = 2.2;

    const shadows = new ShadowGenerator(2048, key);
    shadows.usePercentageCloserFiltering = true;
    shadows.bias = 0.0008;

    this.materials = createMaterialLibrary(scene);
    this.createArena(shadows);

    const factory = new BlockFactory(scene, this.materials);
    this.entities = level.entities.map((entity) => factory.create(entity));
    this.entities.forEach((entity) => shadows.addShadowCaster(entity.mesh));

    this.shotsRemaining = level.inventory["projectile.ball"] ?? 0;
    this.shotsUsed = 0;
    this.completed = false;
    this.startedAt = performance.now();

    this.throwController = new ThrowController(
      scene,
      this.canvas,
      this.materials,
      {
        canThrow: () => !this.completed && this.shotsRemaining > 0,
        onAim: (power) => this.hud.setPower(power),
        onThrow: () => {
          this.shotsRemaining -= 1;
          this.shotsUsed += 1;
          this.hud.setShots(this.shotsRemaining);
          this.hud.setStatus("Impact incoming…");
          this.audio.play("throw");
        },
      },
    );

    this.hud.setLevel(level.name);
    this.hud.setShots(this.shotsRemaining);
    this.hud.setScore(this.score());
    this.hud.setStatus("Drag backward, aim, release.");
  }

  private createArena(shadows: ShadowGenerator): void {
    if (!this.scene || !this.materials) {
      return;
    }

    const mesh = MeshBuilder.CreateBox(
      "arena",
      { width: 11, height: 0.4, depth: 8 },
      this.scene,
    );
    mesh.position.y = -0.2;
    mesh.material = this.materials.platform;
    mesh.receiveShadows = true;

    const aggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.82, restitution: 0.04 },
      this.scene,
    );
    this.platform = { mesh, aggregate };

    const ring = MeshBuilder.CreateTorus(
      "arena-ring",
      { diameter: 10.2, thickness: 0.04, tessellation: 80 },
      this.scene,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    ring.material = this.materials.energy;
    ring.isPickable = false;
    shadows.addShadowCaster(ring);
  }

  private update(): void {
    if (!this.level || this.completed) {
      return;
    }

    this.hud.setScore(this.score());

    if (this.level.objectives.every((objective) => this.objective(objective))) {
      this.completed = true;
      this.hud.setStatus(
        `Structure solved · ${this.score().toLocaleString()} points`,
        "win",
      );
      this.audio.play("goal");
      return;
    }

    if (this.shotsRemaining <= 0) {
      this.hud.setStatus("No shots left — reset and try another angle.");
    }
  }

  private objective(objective: LevelObjective): boolean {
    const targets = this.entities.filter((entity) =>
      entity.tags.includes(objective.targetTag),
    );

    if (objective.type === "moveBelowY") {
      return (
        targets.filter((entity) => entity.mesh.position.y <= objective.y).length >=
        objective.required
      );
    }

    const up = Vector3.Up();
    return (
      targets.filter((entity) => {
        const worldUp = Vector3.TransformNormal(
          up,
          entity.mesh.getWorldMatrix(),
        ).normalize();
        return Vector3.Dot(worldUp, up) <= objective.maxUpDot;
      }).length >= objective.required
    );
  }

  private score(): number {
    if (!this.level) {
      return 0;
    }

    const elapsed = Math.max(0, (performance.now() - this.startedAt) / 1000);
    const base = this.level.scoring?.base ?? 1000;
    const shotPenalty =
      (this.level.scoring?.projectilePenalty ?? 120) * this.shotsUsed;
    const timePenalty =
      (this.level.scoring?.timePenaltyPerSecond ?? 0) * elapsed;

    return Math.max(0, Math.round(base - shotPenalty - timePenalty));
  }

  async reset(): Promise<void> {
    if (!this.level) {
      return;
    }

    this.throwController?.dispose();
    this.throwController = null;
    await this.buildScene(this.level);
  }

  private readonly resize = (): void => this.engine.resize();

  private readonly keydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() === "r") {
      void this.reset();
    }
  };

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keydown);
    this.throwController?.dispose();
    this.scene?.dispose();
    this.audio.dispose();
    this.engine.dispose();
  }
}
