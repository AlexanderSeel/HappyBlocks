import { HavokPlugin, Scene, Vector3 } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
export async function initPhysics(scene:Scene,gravity=new Vector3(0,-9.81,0)):Promise<void>{ const havok=await HavokPhysics(); const plugin=new HavokPlugin(true,havok); scene.enablePhysics(gravity,plugin); }
