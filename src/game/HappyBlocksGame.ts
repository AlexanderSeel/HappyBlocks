import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  HingeConstraint,
  Matrix,
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
import { ASSETS } from "./AssetDefinitions";
import { BlockFactory, type RuntimeEntity } from "./BlockFactory";
import { PhysicsDebugOverlay } from "./debug/PhysicsDebugOverlay";
import { LevelEditorPanel } from "./editor/LevelEditorPanel";
import { spawnImpactBurst } from "./effects/ImpactBurst";
import { spawnPulseWave } from "./effects/PulseWave";
import { RemoveController } from "./input/RemoveController";
import { ThrowController } from "./input/ThrowController";
import { loadLevel as fetchLevel } from "./levels/loadLevel";
import type {
  HappyBlocksLevel,
  LevelEntity,
  LevelObjective,
  ProtectObjective,
} from "./levels/types";
import {
  applyDeviceProfile,
  detectDeviceProfile,
  type DeviceProfile,
} from "./platform/DeviceProfile";
import { Haptics } from "./platform/Haptics";
import { initPhysics } from "./physics/initPhysics";
import { ProgressStore } from "./progression/ProgressStore";
import {
  createMaterialLibrary,
  type MaterialLibrary,
} from "./rendering/materials";
import { VisualAssetLibrary } from "./rendering/VisualAssetLibrary";
import { Hud, type ProjectileHudItem } from "../ui/Hud";

interface PendingBreak {
  entity: RuntimeEntity;
  impulse: number;
  normal: Vector3;
}

const PROJECTILE_LABELS: Record<string, string> = {
  "projectile.ball": "Standard",
  "projectile.heavy": "Heavy",
  "projectile.pulse": "Pulse",
};

export class HappyBlocksGame {
  private readonly engine: Engine;
  private readonly hud = new Hud();
  private readonly audio = new AudioFx();
  private readonly haptics = new Haptics();
  private readonly progress = new ProgressStore();
  private readonly profile: DeviceProfile;
  private readonly debug: PhysicsDebugOverlay;
  private readonly editor: LevelEditorPanel;

  private scene: Scene | null = null;
  private materials: MaterialLibrary | null = null;
  private visuals: VisualAssetLibrary | null = null;
  private factory: BlockFactory | null = null;
  private level: HappyBlocksLevel | null = null;
  private currentLevelUrl = "";
  private levelSequence: string[] = [];
  private editorPreview = false;
  private entities: RuntimeEntity[] = [];
  private platform: { mesh: Mesh; aggregate: PhysicsAggregate } | null = null;
  private throwController: ThrowController | null = null;
  private removeController: RemoveController | null = null;
  private inventory: Record<string, number> = {};
  private selectedProjectile = "projectile.ball";
  private removeActionsRemaining = 0;
  private readonly removedTagCounts = new Map<string, number>();
  private shotsUsed = 0;
  private impactBonus = 0;
  private comboCount = 0;
  private lastScoringImpactAt = 0;
  private startedAt = 0;
  private completed = false;
  private failed = false;
  private renderLoopStarted = false;
  private settling = false;
  private settledSince = 0;
  private lastThrowAt = 0;
  private readonly pendingBreaks = new Map<string, PendingBreak>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.profile = detectDeviceProfile();
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
    });
    applyDeviceProfile(this.engine, this.profile);
    this.debug = new PhysicsDebugOverlay(this.engine);
    this.editor = new LevelEditorPanel({
      onPreview: (level) => this.previewLevelData(level),
      onRestore: () => this.restoreAuthoredLevel(),
    });

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keydown);
    this.hud.resetButton.addEventListener("click", () => void this.reset());
    this.hud.resultRetryButton.addEventListener("click", () => void this.reset());
    this.hud.resultNextButton.addEventListener("click", () => void this.loadNextLevel());
  }

  setLevelSequence(urls: string[]): void {
    this.levelSequence = [...urls];
    this.syncLevelButtons();
  }

  async start(levelUrl: string): Promise<void> {
    await this.loadLevel(levelUrl);

    if (this.renderLoopStarted) {
      return;
    }

    this.renderLoopStarted = true;
    this.engine.runRenderLoop(() => {
      if (!this.scene) {
        return;
      }

      this.update();
      this.scene.render();
    });
  }

  async loadLevel(levelUrl: string): Promise<void> {
    if (!this.progress.isUnlocked(this.levelSequence, levelUrl)) {
      this.hud.setStatus("Level locked · complete the previous challenge first.");
      return;
    }

    const level = await fetchLevel(levelUrl);
    this.currentLevelUrl = levelUrl;
    this.editorPreview = false;
    this.level = level;
    await this.buildScene(level);
    this.editor.setLevel(level);
  }

  private async previewLevelData(level: HappyBlocksLevel): Promise<void> {
    this.editorPreview = true;
    this.level = this.cloneLevel(level);
    await this.buildScene(this.level);
  }

  private async restoreAuthoredLevel(): Promise<void> {
    if (!this.currentLevelUrl) {
      return;
    }
    const level = await fetchLevel(this.currentLevelUrl);
    this.editorPreview = false;
    this.level = level;
    await this.buildScene(level);
    this.editor.setLevel(level);
  }

  private cloneLevel(level: HappyBlocksLevel): HappyBlocksLevel {
    return JSON.parse(JSON.stringify(level)) as HappyBlocksLevel;
  }

  private async loadNextLevel(): Promise<void> {
    const index = this.levelSequence.indexOf(this.currentLevelUrl);
    const nextUrl = index >= 0 ? this.levelSequence[index + 1] : undefined;
    if (!nextUrl || !this.progress.isUnlocked(this.levelSequence, nextUrl)) {
      return;
    }
    await this.loadLevel(nextUrl);
  }

  private async buildScene(level: HappyBlocksLevel): Promise<void> {
    this.throwController?.dispose();
    this.throwController = null;
    this.removeController?.dispose();
    this.removeController = null;
    this.visuals?.dispose();
    this.visuals = null;
    this.scene?.dispose();
    this.hud.hideResult();

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
      pointerInput.pinchDeltaPercentage = 0.01;
      pointerInput.useNaturalPinchZoom = this.profile.coarsePointer;
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

    const shadows = new ShadowGenerator(this.profile.shadowMapSize, key);
    shadows.usePercentageCloserFiltering = !this.profile.lowPower;
    shadows.bias = 0.0008;

    this.materials = createMaterialLibrary(scene);
    this.createArena(shadows, level.arena.platform);

    this.visuals = new VisualAssetLibrary(scene);
    const modelUrls = [
      ...level.entities.map((entity) => ASSETS[entity.asset]?.model),
      ...Object.keys(level.inventory).map((assetId) => ASSETS[assetId]?.model),
    ].filter((value): value is string => Boolean(value));
    await this.visuals.preload(modelUrls);

    this.factory = new BlockFactory(scene, this.materials, this.visuals);
    this.entities = level.entities.map((entity) => this.factory!.create(entity));
    this.entities.forEach((entity) => this.addShadowCasters(shadows, entity));
    this.wireBreakables();
    this.createMechanisms();

    this.inventory = { ...level.inventory };
    this.selectedProjectile = this.projectileIds()[0] ?? "projectile.ball";
    this.removeActionsRemaining = level.actions?.removes ?? 0;
    this.removedTagCounts.clear();
    this.shotsUsed = 0;
    this.impactBonus = 0;
    this.comboCount = 0;
    this.lastScoringImpactAt = 0;
    this.completed = false;
    this.failed = false;
    this.startedAt = performance.now();
    this.settling = false;
    this.settledSince = 0;
    this.lastThrowAt = 0;
    this.pendingBreaks.clear();

    if (level.mode === "remove") {
      this.removeController = new RemoveController(
        scene,
        this.canvas,
        () => this.entities,
        {
          canRemove: (entity) =>
            !this.completed &&
            !this.failed &&
            this.removeActionsRemaining > 0 &&
            entity.tags.includes("removable"),
          onRemove: (entity, point) => this.onRemoveEntity(entity, point),
        },
      );
      this.hud.setResourceLabel("PULLS");
      this.hud.setProjectiles([], "", () => undefined);
      this.hud.setShots(this.removeActionsRemaining);
      this.hud.setStatus("Tap a removable block to pull it out.");
    } else {
      this.throwController = new ThrowController(
        scene,
        this.canvas,
        this.materials,
        {
          canThrow: () =>
            !this.completed &&
            !this.failed &&
            (this.inventory[this.selectedProjectile] ?? 0) > 0,
          getProjectileAsset: () => this.selectedProjectile,
          onAim: (power) => this.hud.setPower(power),
          onThrow: (assetId) => this.onThrow(assetId),
          onImpact: (assetId, impulse, point) =>
            this.onProjectileImpact(assetId, impulse, point),
        },
        this.visuals,
      );
      this.hud.setResourceLabel("SHOTS");
      this.refreshProjectileHud();
      this.hud.setStatus(
        level.mode === "protect"
          ? "Knock down the threats · keep the energy core safe."
          : level.mode === "scoreAttack"
            ? "Score Attack · use every shot and build the biggest chain reactions."
            : "Drag backward, aim, release.",
      );
    }

    this.hud.setLevel(
      this.editorPreview ? `${level.name} · EDITOR PREVIEW` : level.name,
    );
    this.hud.setCombo(0);
    this.hud.setScore(this.score());
    this.syncLevelButtons();
  }

  private createArena(shadows: ShadowGenerator, platformAssetId: string): void {
    if (!this.scene || !this.materials) {
      return;
    }

    const definition = ASSETS[platformAssetId] ?? ASSETS["platform.square"];
    const [width, height, depth] = definition.dimensions;
    const mesh =
      definition.kind === "cylinder"
        ? MeshBuilder.CreateCylinder(
            "arena",
            { height, diameter: definition.radius! * 2, tessellation: 64 },
            this.scene,
          )
        : MeshBuilder.CreateBox(
            "arena",
            { width, height, depth },
            this.scene,
          );
    mesh.position.y = -height / 2;
    mesh.material = this.materials.platform;
    mesh.receiveShadows = true;

    const aggregate = new PhysicsAggregate(
      mesh,
      definition.physicsShape,
      { mass: 0, friction: 0.82, restitution: 0.04 },
      this.scene,
    );
    this.platform = { mesh, aggregate };

    const ringDiameter =
      definition.kind === "cylinder"
        ? definition.radius! * 1.88
        : Math.min(width, depth) * 1.27;
    const ring = MeshBuilder.CreateTorus(
      "arena-ring",
      { diameter: ringDiameter, thickness: 0.04, tessellation: 80 },
      this.scene,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    ring.material = this.materials.energy;
    ring.isPickable = false;
    shadows.addShadowCaster(ring);
  }

  private addShadowCasters(shadows: ShadowGenerator, entity: RuntimeEntity): void {
    if (entity.visualMeshes.length > 0) {
      entity.visualMeshes.forEach((mesh) => shadows.addShadowCaster(mesh));
      return;
    }
    shadows.addShadowCaster(entity.mesh);
  }

  private wireBreakables(): void {
    for (const entity of this.entities) {
      const threshold = entity.source.breakThreshold;
      if (!entity.dynamic || threshold === undefined) {
        continue;
      }

      entity.aggregate.body.setCollisionCallbackEnabled(true);
      entity.aggregate.body.getCollisionObservable().add((collision) => {
        if (entity.broken || collision.impulse < threshold) {
          return;
        }

        const current = this.pendingBreaks.get(entity.id);
        if (current && current.impulse >= collision.impulse) {
          return;
        }

        this.pendingBreaks.set(entity.id, {
          entity,
          impulse: collision.impulse,
          normal: collision.normal?.clone() ?? Vector3.Up(),
        });
      });
    }
  }

  private flushBreaks(): void {
    if (this.pendingBreaks.size === 0 || !this.factory) {
      return;
    }

    const pending = [...this.pendingBreaks.values()];
    this.pendingBreaks.clear();
    for (const request of pending) {
      this.breakEntity(request);
    }
  }

  private breakEntity(request: PendingBreak): void {
    const { entity, impulse, normal } = request;
    if (entity.broken || !this.factory) {
      return;
    }

    entity.broken = true;
    const position = entity.mesh.position.clone();
    const rotation = entity.mesh.rotationQuaternion?.clone();
    const euler = rotation?.toEulerAngles() ?? entity.mesh.rotation.clone();
    const linearVelocity = entity.aggregate.body.getLinearVelocity();
    const angularVelocity = entity.aggregate.body.getAngularVelocity();
    const source = entity.source;

    if (this.scene) {
      spawnImpactBurst(
        this.scene,
        position,
        impulse,
        "dust",
        this.profile.effectScale,
      );
    }
    entity.disposeVisual();
    entity.aggregate.dispose();
    entity.mesh.dispose();
    this.entities = this.entities.filter((candidate) => candidate !== entity);

    const rotationMatrix = rotation
      ? Matrix.Compose(Vector3.One(), rotation, Vector3.Zero())
      : Matrix.Identity();
    const offsets = [-0.92, -0.46, 0, 0.46, 0.92];

    offsets.forEach((offset, index) => {
      const localOffset = new Vector3(0, offset, 0);
      const worldOffset = Vector3.TransformNormal(localOffset, rotationMatrix);
      const segmentPosition = position.add(worldOffset);
      const segmentSource: LevelEntity = {
        id: `${source.id}-fragment-${index + 1}`,
        asset: "block.cube",
        material: source.material,
        position: [segmentPosition.x, segmentPosition.y, segmentPosition.z],
        rotation: [euler.x, euler.y, euler.z],
        scale: [0.72, 0.42, 0.72],
        motion: "DYNAMIC",
        tags: [...(source.tags ?? []), "debris"],
        massScale: 0.38,
      };
      const fragment = this.factory!.create(segmentSource);
      const radial = new Vector3(
        Math.cos(index * 2.3),
        0.24 + index * 0.025,
        Math.sin(index * 2.3),
      )
        .normalize()
        .scale(Math.min(2.2, 0.18 + impulse * 0.035));
      fragment.aggregate.body.setLinearVelocity(
        linearVelocity.add(radial).add(normal.scale(0.08)),
      );
      fragment.aggregate.body.setAngularVelocity(
        angularVelocity.add(new Vector3(0.2 * index, 0.35, -0.15 * index)),
      );
      this.entities.push(fragment);
    });

    this.audio.play("impactHeavy", Math.min(1.6, 0.7 + impulse / 18));
    this.haptics.trigger("impactHeavy");
  }

  private createMechanisms(): void {
    if (!this.scene) {
      return;
    }

    for (const spinner of this.entities.filter(
      (entity) => entity.source.asset === "spinner.cross",
    )) {
      const anchor = MeshBuilder.CreateBox(
        `${spinner.id}-anchor`,
        { size: 0.04 },
        this.scene,
      );
      anchor.position.copyFrom(spinner.mesh.position);
      anchor.isVisible = false;
      const anchorAggregate = new PhysicsAggregate(
        anchor,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0, restitution: 0 },
        this.scene,
      );
      const hinge = new HingeConstraint(
        Vector3.Zero(),
        Vector3.Zero(),
        Vector3.Up(),
        Vector3.Up(),
        this.scene,
      );
      anchorAggregate.body.addConstraint(spinner.aggregate.body, hinge);
      spinner.aggregate.body.setAngularDamping(0.08);
      spinner.aggregate.body.setAngularVelocity(new Vector3(0, 0.8, 0));
    }
  }

  private onThrow(assetId: string): void {
    this.inventory[assetId] = Math.max(0, (this.inventory[assetId] ?? 0) - 1);
    this.shotsUsed += 1;
    this.comboCount = 0;
    this.lastScoringImpactAt = 0;
    this.hud.setCombo(0);
    this.beginSettling();

    if ((this.inventory[this.selectedProjectile] ?? 0) <= 0) {
      const next = this.projectileIds().find(
        (candidate) => (this.inventory[candidate] ?? 0) > 0,
      );
      if (next) {
        this.selectedProjectile = next;
      }
    }

    this.refreshProjectileHud();
    this.hud.setStatus("Impact incoming…");
    this.audio.play("throw");
    this.haptics.trigger("throw");
  }

  private onRemoveEntity(entity: RuntimeEntity, point: Vector3): void {
    if (
      this.completed ||
      this.failed ||
      this.removeActionsRemaining <= 0 ||
      !entity.tags.includes("removable")
    ) {
      return;
    }

    this.removeActionsRemaining -= 1;
    this.shotsUsed += 1;
    for (const tag of entity.tags) {
      this.removedTagCounts.set(tag, (this.removedTagCounts.get(tag) ?? 0) + 1);
    }

    if (this.scene) {
      spawnImpactBurst(
        this.scene,
        point,
        5,
        "energy",
        this.profile.effectScale,
      );
    }
    entity.disposeVisual();
    entity.aggregate.dispose();
    entity.mesh.dispose();
    this.entities = this.entities.filter((candidate) => candidate !== entity);
    this.hud.setShots(this.removeActionsRemaining);
    this.hud.setStatus(
      this.removeActionsRemaining > 0
        ? "Block pulled · let the structure settle."
        : "Last pull used · let the structure settle.",
    );
    this.audio.play("impactLight", 0.8);
    this.haptics.trigger("remove");
    this.beginSettling();
  }

  private beginSettling(): void {
    this.settling = true;
    this.settledSince = 0;
    this.lastThrowAt = performance.now();
  }

  private onProjectileImpact(assetId: string, impulse: number, point: Vector3): void {
    if (this.scene) {
      spawnImpactBurst(
        this.scene,
        point,
        impulse,
        assetId === "projectile.pulse"
          ? "energy"
          : impulse >= 6
            ? "spark"
            : "dust",
        this.profile.effectScale,
      );
    }

    if (assetId === "projectile.pulse") {
      this.triggerPulse(point);
    }

    if (impulse < 1.2) {
      return;
    }

    const now = performance.now();
    const comboWindow = this.level?.scoring?.impactComboWindowMs ?? 800;
    this.comboCount =
      now - this.lastScoringImpactAt <= comboWindow ? this.comboCount + 1 : 1;
    this.lastScoringImpactAt = now;
    const comboMultiplier = this.level?.scoring?.comboMultiplier ?? 1.15;
    const multiplier = Math.pow(comboMultiplier, Math.min(this.comboCount - 1, 4));
    this.impactBonus += Math.round(Math.min(impulse, 18) * 8 * multiplier);
    this.hud.setCombo(this.comboCount);

    if (impulse >= 6) {
      this.audio.play("impactHeavy", Math.min(1.5, 0.55 + impulse / 20));
      this.haptics.trigger("impactHeavy");
    } else {
      this.audio.play("impactLight", Math.min(1.25, 0.5 + impulse / 10));
      if (impulse >= 2.5) {
        this.haptics.trigger("impactLight");
      }
    }
  }

  private triggerPulse(point: Vector3): void {
    if (!this.scene) {
      return;
    }

    if (!this.profile.reducedMotion) {
      spawnPulseWave(this.scene, point);
    }
    this.audio.play("pulse");
    this.haptics.trigger("pulse");
    const radius = 3.1;
    const maxImpulse = 6.5;

    for (const entity of this.entities) {
      if (!entity.dynamic || entity.broken || entity.source.asset === "spinner.cross") {
        continue;
      }

      const offset = entity.mesh.position.subtract(point);
      const distance = offset.length();
      if (distance > radius) {
        continue;
      }

      const direction =
        distance < 0.08
          ? Vector3.Up()
          : offset.scale(1 / distance).add(new Vector3(0, 0.22, 0)).normalize();
      const strength = maxImpulse * Math.pow(1 - distance / radius, 1.35);
      entity.aggregate.body.applyImpulse(
        direction.scale(strength),
        entity.mesh.position,
      );
    }
  }

  private update(): void {
    if (!this.level) {
      return;
    }

    this.flushBreaks();
    this.updateDebug();
    if (this.completed || this.failed) {
      return;
    }

    this.hud.setScore(this.score());

    const failedProtection = this.failedProtectObjective();
    if (failedProtection) {
      this.failLevel(failedProtection);
      return;
    }

    if (
      this.level.mode !== "scoreAttack" &&
      this.level.objectives.every((objective) => this.objective(objective))
    ) {
      this.completeLevel();
      return;
    }

    if (this.updateSettledState()) {
      return;
    }

    if (
      this.level.mode === "scoreAttack" &&
      !this.settling &&
      this.totalActionsRemaining() <= 0
    ) {
      this.completeLevel();
      return;
    }

    if (!this.settling && this.totalActionsRemaining() <= 0) {
      this.hud.setStatus(
        this.level.mode === "remove"
          ? "No pulls left — reset and try a different structure path."
          : "No shots left — reset and try another angle.",
      );
    }
  }

  private updateDebug(): void {
    if (!this.level) {
      return;
    }
    const entityBodies = this.entities
      .filter((entity) => entity.dynamic)
      .map((entity) => entity.aggregate.body);
    const projectileBodies = this.throwController?.getBodies() ?? [];
    this.debug.update({
      level: this.level.name,
      mode: this.editorPreview ? `${this.level.mode} / editor` : this.level.mode,
      bodies: [...entityBodies, ...projectileBodies],
      entities: this.entities.length,
      projectiles: projectileBodies.length,
      pendingBreaks: this.pendingBreaks.size,
      actionsRemaining: this.totalActionsRemaining(),
      selectedProjectile:
        this.level.mode === "remove" ? "block pull" : this.selectedProjectile,
    });
  }

  private completeLevel(): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    const score = this.score();
    const stars = this.starsForScore(score);
    if (!this.editorPreview) {
      this.progress.recordResult(this.currentLevelUrl, score, stars);
      this.syncLevelButtons();
    }
    const currentIndex = this.levelSequence.indexOf(this.currentLevelUrl);
    const nextUrl = currentIndex >= 0 ? this.levelSequence[currentIndex + 1] : undefined;
    const hasNext = Boolean(
      !this.editorPreview &&
        nextUrl &&
        this.progress.isUnlocked(this.levelSequence, nextUrl),
    );
    const resultLabel = this.level?.mode === "scoreAttack" ? "Score attack complete" : "Structure solved";
    this.hud.setStatus(
      this.editorPreview
        ? `Editor preview solved · ${score.toLocaleString()} points`
        : `${resultLabel} · ${score.toLocaleString()} points`,
      "win",
    );
    this.hud.showResult(score, stars, hasNext);
    this.audio.play("goal");
    this.haptics.trigger("success");
  }

  private failLevel(objective: ProtectObjective): void {
    this.failed = true;
    const message = `Protected '${objective.targetTag}' was lost.`;
    this.hud.setStatus(`${message} · Retry the level.`, "fail");
    this.hud.showFailure(message);
    this.audio.play("impactHeavy", 0.65);
    this.haptics.trigger("fail");
  }

  private failedProtectObjective(): ProtectObjective | undefined {
    return this.level?.objectives.find(
      (objective): objective is ProtectObjective =>
        objective.type === "protect" && !this.objective(objective),
    );
  }

  private starsForScore(score: number): number {
    const thresholds = this.level?.scoring?.starThresholds ?? [350, 650, 850];
    return thresholds.reduce(
      (stars, threshold) => stars + (score >= threshold ? 1 : 0),
      0,
    );
  }

  private updateSettledState(): boolean {
    if (!this.settling || performance.now() - this.lastThrowAt < 350) {
      return false;
    }

    const bodies = [
      ...this.entities
        .filter(
          (entity) => entity.dynamic && entity.source.asset !== "spinner.cross",
        )
        .map((entity) => entity.aggregate.body),
      ...(this.throwController?.getBodies() ?? []),
    ];
    const allQuiet = bodies.every(
      (body) =>
        body.getLinearVelocity().lengthSquared() < 0.018 &&
        body.getAngularVelocity().lengthSquared() < 0.035,
    );

    if (!allQuiet) {
      this.settledSince = 0;
      return false;
    }

    if (this.settledSince === 0) {
      this.settledSince = performance.now();
      return false;
    }

    if (performance.now() - this.settledSince < 650) {
      return false;
    }

    this.settling = false;
    this.settledSince = 0;
    this.hud.setStatus(
      this.totalActionsRemaining() > 0
        ? this.level?.mode === "remove"
          ? "World settled · choose the next block to pull."
          : this.level?.mode === "scoreAttack"
            ? "World settled · spend the next shot where it can multiply the score."
            : "World settled · line up the next shot."
        : this.level?.mode === "remove"
          ? "World settled · no pulls left."
          : this.level?.mode === "scoreAttack"
            ? "World settled · score attack complete."
            : "World settled · no shots left.",
    );
    return true;
  }

  private objective(objective: LevelObjective): boolean {
    if (objective.type === "removed") {
      return (this.removedTagCounts.get(objective.targetTag) ?? 0) >= objective.required;
    }

    const targets = this.entities.filter((entity) =>
      entity.tags.includes(objective.targetTag),
    );

    if (objective.type === "moveBelowY") {
      return (
        targets.filter((entity) => entity.mesh.position.y <= objective.y).length >=
        objective.required
      );
    }

    if (objective.type === "protect") {
      const up = Vector3.Up();
      const safe = targets.filter((entity) => {
        if (entity.mesh.position.y < objective.minY) {
          return false;
        }
        if (objective.minUpDot === undefined) {
          return true;
        }
        const worldUp = Vector3.TransformNormal(
          up,
          entity.mesh.getWorldMatrix(),
        ).normalize();
        return Vector3.Dot(worldUp, up) >= objective.minUpDot;
      });
      return safe.length >= objective.required;
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

  private projectileIds(): string[] {
    return Object.keys(this.inventory).filter(
      (assetId) => assetId.startsWith("projectile.") && ASSETS[assetId],
    );
  }

  private refreshProjectileHud(): void {
    const ids = this.projectileIds();
    const items: ProjectileHudItem[] = ids.map((id, index) => ({
      id,
      label: PROJECTILE_LABELS[id] ?? id.replace("projectile.", ""),
      count: this.inventory[id] ?? 0,
      keyHint: String(index + 1),
    }));

    this.hud.setShots(this.totalShotsRemaining());
    this.hud.setProjectiles(items, this.selectedProjectile, (id) => {
      if ((this.inventory[id] ?? 0) <= 0) {
        return;
      }
      this.selectedProjectile = id;
      this.audio.play("uiClick");
      this.refreshProjectileHud();
    });
  }

  private totalShotsRemaining(): number {
    return this.projectileIds().reduce(
      (sum, id) => sum + (this.inventory[id] ?? 0),
      0,
    );
  }

  private totalActionsRemaining(): number {
    return this.level?.mode === "remove"
      ? this.removeActionsRemaining
      : this.totalShotsRemaining();
  }

  private score(): number {
    if (!this.level) {
      return 0;
    }
    const base = this.level.scoring?.base ?? 1000;
    const projectilePenalty = this.level.scoring?.projectilePenalty ?? 90;
    const timePenaltyPerSecond = this.level.scoring?.timePenaltyPerSecond ?? 0;
    const elapsedSeconds = Math.max(0, (performance.now() - this.startedAt) / 1000);
    return Math.max(
      0,
      Math.round(
        base +
          this.impactBonus -
          this.shotsUsed * projectilePenalty -
          elapsedSeconds * timePenaltyPerSecond,
      ),
    );
  }

  private syncLevelButtons(): void {
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>("[data-level-url]"),
    ];
    for (const button of buttons) {
      const url = button.dataset.levelUrl;
      if (!url) continue;
      button.disabled = !this.progress.isUnlocked(this.levelSequence, url);
      button.dataset.active = String(url === this.currentLevelUrl);
    }
  }

  async reset(): Promise<void> {
    if (!this.level) {
      return;
    }
    await this.buildScene(this.cloneLevel(this.level));
  }

  private readonly resize = (): void => this.engine.resize();

  private readonly keydown = (event: KeyboardEvent): void => {
    if (this.editor.isOpen()) {
      return;
    }
    if (event.key.toLowerCase() === "r") {
      void this.reset();
    }
    if (event.key === "F3") {
      event.preventDefault();
      this.debug.toggle();
    }
    const number = Number(event.key);
    if (Number.isInteger(number) && number > 0) {
      const id = this.projectileIds()[number - 1];
      if (id && (this.inventory[id] ?? 0) > 0) {
        this.selectedProjectile = id;
        this.audio.play("uiClick");
        this.refreshProjectileHud();
      }
    }
  };

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keydown);
    this.throwController?.dispose();
    this.removeController?.dispose();
    this.editor.dispose();
    this.debug.dispose();
    this.visuals?.dispose();
    this.scene?.dispose();
    this.engine.dispose();
  }
}
