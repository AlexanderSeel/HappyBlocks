import { HavokPlugin, Scene, Vector3 } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import havokWasmUrl from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";

let havokPromise: ReturnType<typeof HavokPhysics> | null = null;

async function loadHavok(): ReturnType<typeof HavokPhysics> {
  if (!havokPromise) {
    havokPromise = HavokPhysics({
      locateFile: (path: string) =>
        path.endsWith(".wasm") ? havokWasmUrl : path,
    });
  }
  return havokPromise;
}

export async function initPhysics(
  scene: Scene,
  gravity = new Vector3(0, -9.81, 0),
): Promise<void> {
  const havok = await loadHavok();
  const plugin = new HavokPlugin(true, havok);
  scene.enablePhysics(gravity, plugin);
}
