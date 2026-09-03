import {
  AbstractMesh,
  AssetContainer,
  Material,
  Scene,
  SceneLoader,
  TransformNode,
} from "@babylonjs/core";

export interface VisualInstance {
  meshes: AbstractMesh[];
  dispose: () => void;
}

export class VisualAssetLibrary {
  private readonly containers = new Map<string, AssetContainer>();

  constructor(private readonly scene: Scene) {}

  async preload(modelUrls: string[]): Promise<void> {
    const uniqueUrls = [...new Set(modelUrls.filter(Boolean))];

    await Promise.all(
      uniqueUrls.map(async (modelUrl) => {
        if (this.containers.has(modelUrl)) {
          return;
        }

        const slash = modelUrl.lastIndexOf("/");
        const rootUrl = modelUrl.slice(0, slash + 1);
        const fileName = modelUrl.slice(slash + 1);

        try {
          const container = await SceneLoader.LoadAssetContainerAsync(
            rootUrl,
            fileName,
            this.scene,
          );
          this.containers.set(modelUrl, container);
        } catch (error) {
          console.warn(`HappyBlocks: could not load visual asset ${modelUrl}`, error);
        }
      }),
    );
  }

  instantiate(
    modelUrl: string,
    parent: TransformNode,
    material: Material,
    instanceName: string,
  ): VisualInstance | null {
    const container = this.containers.get(modelUrl);
    if (!container) {
      return null;
    }

    const entries = container.instantiateModelsToScene(
      (sourceName) => `${instanceName}:${sourceName}`,
      false,
      { doNotInstantiate: true },
    );
    const meshes: AbstractMesh[] = [];

    for (const root of entries.rootNodes) {
      if (root instanceof TransformNode) {
        root.parent = parent;
      }

      const nodes = [root, ...root.getDescendants(false)];
      for (const node of nodes) {
        if (!(node instanceof AbstractMesh)) {
          continue;
        }

        node.material = material;
        node.isPickable = false;
        node.receiveShadows = true;
        meshes.push(node);
      }
    }

    return {
      meshes,
      dispose: () => entries.dispose(),
    };
  }

  dispose(): void {
    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();
  }
}
