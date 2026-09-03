import {
  AbstractMesh,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsMotionType,
  Quaternion,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { ASSETS } from "./AssetDefinitions";
import { bindEditorSelection } from "./editor/editorEvents";
import type { LevelEntity } from "./levels/types";
import { getPhysicsSurface } from "./physics/PhysicsMaterials";
import type { MaterialLibrary } from "./rendering/materials";
import type { VisualAssetLibrary } from "./rendering/VisualAssetLibrary";

export interface RuntimeEntity {
  id: string;
  tags: string[];
  mesh: Mesh;
  aggregate: PhysicsAggregate;
  initialPosition: Vector3;
  source: LevelEntity;
  dynamic: boolean;
  visualMeshes: AbstractMesh[];
  disposeVisual: () => void;
  broken: boolean;
}

export class BlockFactory {
  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialLibrary,
    private readonly visuals?: VisualAssetLibrary,
  ) {}

  create(entity: LevelEntity): RuntimeEntity {
    const definition = ASSETS[entity.asset];
    if (!definition) {
      throw new Error(`Unknown asset '${entity.asset}'`);
    }

    const [width, height, depth] = definition.dimensions;
    let mesh: Mesh;

    if (definition.kind === "sphere") {
      mesh = MeshBuilder.CreateSphere(
        entity.id,
        { diameter: definition.radius! * 2, segments: 20 },
        this.scene,
      );
    } else if (definition.kind === "cylinder") {
      mesh = MeshBuilder.CreateCylinder(
        entity.id,
        { height, diameter: definition.radius! * 2, tessellation: 20 },
        this.scene,
      );
    } else {
      mesh = MeshBuilder.CreateBox(
        entity.id,
        { width, height, depth },
        this.scene,
      );
    }

    mesh.position.copyFromFloats(...entity.position);
    mesh.rotationQuaternion = Quaternion.FromEulerAngles(...(entity.rotation ?? [0, 0, 0]));
    if (entity.scale) {
      mesh.scaling.copyFromFloats(...entity.scale);
    }

    const materialId = entity.material ?? "wood";
    const material = this.materials[materialId] ?? this.materials.wood;
    mesh.material = material;
    mesh.receiveShadows = true;
    mesh.metadata = {
      assetId: entity.asset,
      materialId,
      tags: entity.tags ?? [],
      happyBlocksEntityId: entity.id,
    };

    const visual = this.visuals?.instantiate(
      definition.model,
      mesh,
      material,
      entity.id,
    );
    if (visual) {
      mesh.isVisible = false;
    }

    let editorBindingActive = true;
    const unbindEditorSelection = bindEditorSelection((selectedId) => {
      const selected = selectedId === entity.id;
      if (visual?.meshes.length) {
        visual.meshes.forEach((visualMesh) => {
          visualMesh.showBoundingBox = selected;
        });
      } else {
        mesh.showBoundingBox = selected;
      }
    });
    const releaseEditorBinding = (): void => {
      if (!editorBindingActive) {
        return;
      }
      editorBindingActive = false;
      unbindEditorSelection();
    };
    this.scene.onDisposeObservable.addOnce(releaseEditorBinding);

    const dynamic = entity.motion === "DYNAMIC";
    const surface = getPhysicsSurface(entity.asset, materialId);
    const aggregate = new PhysicsAggregate(
      mesh,
      definition.physicsShape,
      {
        mass: dynamic ? definition.mass * (entity.massScale ?? 1) : 0,
        friction: surface.friction,
        restitution: surface.restitution,
      },
      this.scene,
    );

    if (!dynamic) {
      aggregate.body.setMotionType(PhysicsMotionType.STATIC);
    } else {
      aggregate.body.setLinearDamping(0.015);
      aggregate.body.setAngularDamping(0.025);
    }

    return {
      id: entity.id,
      tags: entity.tags ?? [],
      mesh,
      aggregate,
      initialPosition: mesh.position.clone(),
      source: entity,
      dynamic,
      visualMeshes: visual?.meshes ?? [],
      disposeVisual: () => {
        releaseEditorBinding();
        visual?.dispose();
      },
      broken: false,
    };
  }
}
