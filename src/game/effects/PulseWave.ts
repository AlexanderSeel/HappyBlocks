import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

export function spawnPulseWave(scene: Scene, position: Vector3): void {
  const shell = MeshBuilder.CreateSphere(
    `pulse-wave-${performance.now().toFixed(0)}`,
    { diameter: 1, segments: 24 },
    scene,
  );
  shell.position.copyFrom(position);
  shell.scaling.setAll(0.25);
  shell.isPickable = false;

  const material = new StandardMaterial(`${shell.name}-material`, scene);
  material.diffuseColor = new Color3(0.08, 0.85, 1);
  material.emissiveColor = new Color3(0.12, 0.9, 1);
  material.alpha = 0.34;
  material.backFaceCulling = false;
  shell.material = material;

  let age = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    age += scene.getEngine().getDeltaTime() / 1000;
    const progress = Math.min(age / 0.42, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    shell.scaling.setAll(0.25 + eased * 6.2);
    material.alpha = 0.34 * (1 - progress);

    if (progress >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      shell.dispose();
      material.dispose();
    }
  });
}
