import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  GizmoManager,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointerEventTypes,
  Quaternion,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { ASSETS } from "../AssetDefinitions";
import type { HappyBlocksLevel, LevelEntity } from "../levels/types";

export type EditorGizmoMode = "position" | "rotation" | "scale";

export interface EditorTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface EditorViewportCallbacks {
  onSelection: (entityId: string | null) => void;
  onTransform: (entityId: string, transform: EditorTransform) => void;
}

const MATERIAL_COLORS: Record<string, string> = {
  wood: "#b77a42",
  stone: "#9ba8ad",
  metal: "#73858d",
  rubber: "#18252b",
  ceramic: "#edf4f4",
  ceramic_cyan: "#28c9e7",
  ceramic_amber: "#f2ae43",
  ceramic_violet: "#8d6ae8",
  energy: "#ffe58b",
};

export class EditorViewport {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly gizmos: GizmoManager;
  private readonly meshes = new Map<string, Mesh>();
  private readonly materials = new Map<string, PBRMaterial>();
  private readonly resizeObserver: ResizeObserver;
  private selectedId: string | null = null;
  private mode: EditorGizmoMode = "position";
  private lastTransformHash = "";
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: EditorViewportCallbacks,
  ) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.018, 0.045, 0.055, 1);

    this.camera = new ArcRotateCamera(
      "editor-camera",
      -1.45,
      1.08,
      11,
      new Vector3(0, 1.5, 0),
      this.scene,
    );
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 30;
    this.camera.wheelPrecision = 35;
    this.camera.attachControl(canvas, true);

    const light = new HemisphericLight(
      "editor-light",
      new Vector3(0.35, 1, -0.2),
      this.scene,
    );
    light.intensity = 1.05;
    light.groundColor = new Color3(0.08, 0.11, 0.12);

    const grid = MeshBuilder.CreateGround(
      "editor-grid",
      { width: 18, height: 18, subdivisions: 1 },
      this.scene,
    );
    const gridMaterial = new PBRMaterial("editor-grid-material", this.scene);
    gridMaterial.albedoColor = new Color3(0.035, 0.095, 0.11);
    gridMaterial.metallic = 0.35;
    gridMaterial.roughness = 0.62;
    grid.material = gridMaterial;
    grid.isPickable = false;

    this.gizmos = new GizmoManager(this.scene);
    this.gizmos.usePointerToAttachGizmos = false;
    this.applyGizmoMode();

    this.scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERDOWN) {
        return;
      }
      const event = info.event as PointerEvent;
      if (event.button !== 0 || this.gizmos.isHovered) {
        return;
      }
      const entityId = info.pickInfo?.pickedMesh?.metadata?.happyBlocksEditorId as
        | string
        | undefined;
      this.select(entityId ?? null, true);
    });

    this.scene.onBeforeRenderObservable.add(() => this.syncSelectedTransform());
    this.engine.runRenderLoop(() => {
      if (!this.disposed && !this.canvas.closest("[hidden]")) {
        this.scene.render();
      }
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  setLevel(level: HappyBlocksLevel, preferredSelection?: string | null): void {
    this.gizmos.attachToMesh(null);
    this.meshes.forEach((mesh) => mesh.dispose());
    this.meshes.clear();
    this.selectedId = null;
    this.lastTransformHash = "";

    for (const entity of level.entities) {
      const mesh = this.createEntityMesh(entity);
      this.meshes.set(entity.id, mesh);
    }

    this.camera.target.copyFromFloats(...level.camera.target);
    this.camera.radius = Math.min(22, Math.max(5, level.camera.radius));
    const selection =
      preferredSelection && this.meshes.has(preferredSelection)
        ? preferredSelection
        : level.entities[0]?.id ?? null;
    this.select(selection, false);
    this.resize();
  }

  select(entityId: string | null, emit = false): void {
    this.selectedId = entityId && this.meshes.has(entityId) ? entityId : null;
    const mesh = this.selectedId ? this.meshes.get(this.selectedId) ?? null : null;
    this.gizmos.attachToMesh(mesh);
    this.lastTransformHash = mesh ? this.hashTransform(mesh) : "";
    this.meshes.forEach((candidate, id) => {
      candidate.showBoundingBox = id === this.selectedId;
    });
    if (emit) {
      this.callbacks.onSelection(this.selectedId);
    }
  }

  setMode(mode: EditorGizmoMode): void {
    this.mode = mode;
    this.applyGizmoMode();
  }

  updateEntity(entity: LevelEntity): void {
    const mesh = this.meshes.get(entity.id);
    if (!mesh) {
      return;
    }
    this.applyTransform(mesh, {
      position: [...entity.position],
      rotation: [...(entity.rotation ?? [0, 0, 0])],
      scale: [...(entity.scale ?? [1, 1, 1])],
    });
    mesh.material = this.materialFor(entity.material ?? "wood");
    this.lastTransformHash = this.hashTransform(mesh);
  }

  resize(): void {
    if (!this.disposed) {
      this.engine.resize();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.gizmos.dispose();
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();
    this.scene.dispose();
    this.engine.dispose();
  }

  private createEntityMesh(entity: LevelEntity): Mesh {
    const definition = ASSETS[entity.asset];
    if (!definition) {
      throw new Error(`Unknown editor asset '${entity.asset}'.`);
    }
    const [width, height, depth] = definition.dimensions;
    let mesh: Mesh;
    if (definition.kind === "sphere") {
      mesh = MeshBuilder.CreateSphere(
        `editor:${entity.id}`,
        { diameter: definition.radius! * 2, segments: 20 },
        this.scene,
      );
    } else if (definition.kind === "cylinder") {
      mesh = MeshBuilder.CreateCylinder(
        `editor:${entity.id}`,
        { height, diameter: definition.radius! * 2, tessellation: 24 },
        this.scene,
      );
    } else {
      mesh = MeshBuilder.CreateBox(
        `editor:${entity.id}`,
        { width, height, depth },
        this.scene,
      );
    }
    mesh.metadata = { happyBlocksEditorId: entity.id };
    mesh.material = this.materialFor(entity.material ?? "wood");
    mesh.isPickable = true;
    this.applyTransform(mesh, {
      position: [...entity.position],
      rotation: [...(entity.rotation ?? [0, 0, 0])],
      scale: [...(entity.scale ?? [1, 1, 1])],
    });
    return mesh;
  }

  private materialFor(materialId: string): PBRMaterial {
    const existing = this.materials.get(materialId);
    if (existing) {
      return existing;
    }
    const material = new PBRMaterial(`editor-material:${materialId}`, this.scene);
    material.albedoColor = Color3.FromHexString(
      MATERIAL_COLORS[materialId] ?? "#8ba6ae",
    );
    material.metallic = materialId === "metal" ? 0.82 : 0.04;
    material.roughness = materialId === "rubber" ? 0.72 : 0.38;
    if (materialId === "energy") {
      material.emissiveColor = new Color3(1, 0.55, 0.08);
    }
    this.materials.set(materialId, material);
    return material;
  }

  private applyGizmoMode(): void {
    this.gizmos.positionGizmoEnabled = this.mode === "position";
    this.gizmos.rotationGizmoEnabled = this.mode === "rotation";
    this.gizmos.scaleGizmoEnabled = this.mode === "scale";
  }

  private syncSelectedTransform(): void {
    if (!this.selectedId) {
      return;
    }
    const mesh = this.meshes.get(this.selectedId);
    if (!mesh) {
      return;
    }
    const hash = this.hashTransform(mesh);
    if (hash === this.lastTransformHash) {
      return;
    }
    this.lastTransformHash = hash;
    const rotation = mesh.rotationQuaternion?.toEulerAngles() ?? mesh.rotation;
    this.callbacks.onTransform(this.selectedId, {
      position: [mesh.position.x, mesh.position.y, mesh.position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      scale: [mesh.scaling.x, mesh.scaling.y, mesh.scaling.z],
    });
  }

  private applyTransform(mesh: Mesh, transform: EditorTransform): void {
    mesh.position.copyFromFloats(...transform.position);
    mesh.rotationQuaternion = Quaternion.FromEulerAngles(...transform.rotation);
    mesh.scaling.copyFromFloats(...transform.scale);
    mesh.computeWorldMatrix(true);
  }

  private hashTransform(mesh: Mesh): string {
    const rotation = mesh.rotationQuaternion?.toEulerAngles() ?? mesh.rotation;
    return [
      mesh.position.x,
      mesh.position.y,
      mesh.position.z,
      rotation.x,
      rotation.y,
      rotation.z,
      mesh.scaling.x,
      mesh.scaling.y,
      mesh.scaling.z,
    ]
      .map((value) => value.toFixed(4))
      .join("|");
  }
}
