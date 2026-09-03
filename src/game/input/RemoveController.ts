import {
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
  Vector3,
} from "@babylonjs/core";
import type { RuntimeEntity } from "../BlockFactory";

export interface RemoveEvents {
  canRemove: (entity: RuntimeEntity) => boolean;
  onRemove: (entity: RuntimeEntity, point: Vector3) => void;
}

export class RemoveController {
  private down: { x: number; y: number } | null = null;
  private observer: Observer<PointerInfo> | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly getEntities: () => RuntimeEntity[],
    private readonly events: RemoveEvents,
  ) {
    this.canvas.style.cursor = "crosshair";
    this.observer = scene.onPointerObservable.add((info) => {
      const event = info.event as PointerEvent;
      if (info.type === PointerEventTypes.POINTERDOWN && event.button === 0) {
        this.down = { x: event.clientX, y: event.clientY };
      }
      if (info.type === PointerEventTypes.POINTERUP && event.button === 0) {
        this.release(event);
      }
    });
  }

  private release(event: PointerEvent): void {
    if (!this.down) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - this.down.x,
      event.clientY - this.down.y,
    );
    this.down = null;
    if (distance > 10) {
      return;
    }

    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      (mesh) => Boolean(mesh.isPickable && mesh.metadata?.happyBlocksEntityId),
    );
    const entityId = pick?.pickedMesh?.metadata?.happyBlocksEntityId as
      | string
      | undefined;
    if (!entityId) {
      return;
    }

    const entity = this.getEntities().find((candidate) => candidate.id === entityId);
    if (!entity || !this.events.canRemove(entity)) {
      return;
    }

    this.events.onRemove(
      entity,
      pick?.pickedPoint?.clone() ?? entity.mesh.position.clone(),
    );
  }

  dispose(): void {
    if (this.observer) {
      this.scene.onPointerObservable.remove(this.observer);
      this.observer = null;
    }
    this.canvas.style.cursor = "default";
    this.down = null;
  }
}
