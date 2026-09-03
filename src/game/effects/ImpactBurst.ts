import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

export type ImpactBurstKind = "dust" | "spark" | "energy";

export function spawnImpactBurst(
  scene: Scene,
  point: Vector3,
  impulse: number,
  kind: ImpactBurstKind,
  density = 1,
): void {
  const baseCount = Math.max(4, Math.min(12, Math.round(impulse * 0.8)));
  const count = Math.max(2, Math.round(baseCount * Math.max(0.2, density)));
  const material = new StandardMaterial(
    `impact-${kind}-${performance.now().toFixed(0)}`,
    scene,
  );

  if (kind === "spark") {
    material.diffuseColor = new Color3(1, 0.62, 0.18);
    material.emissiveColor = new Color3(1, 0.3, 0.04);
  } else if (kind === "energy") {
    material.diffuseColor = new Color3(0.1, 0.88, 1);
    material.emissiveColor = new Color3(0.05, 0.7, 1);
  } else {
    material.diffuseColor = new Color3(0.56, 0.62, 0.62);
    material.emissiveColor = new Color3(0.04, 0.05, 0.05);
  }
  material.alpha = kind === "dust" ? 0.5 : 0.82;

  const particles: Array<{ mesh: Mesh; velocity: Vector3 }> = [];
  const speed = Math.min(4.2, 0.8 + impulse * 0.13);

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + impulse * 0.17;
    const elevation = 0.16 + (index % 4) * 0.11;
    const velocity = new Vector3(
      Math.cos(angle),
      elevation,
      Math.sin(angle),
    )
      .normalize()
      .scale(speed * (0.65 + (index % 3) * 0.16));
    const mesh = MeshBuilder.CreateSphere(
      `impact-particle-${index}`,
      { diameter: kind === "dust" ? 0.1 : 0.055, segments: 4 },
      scene,
    );
    mesh.position.copyFrom(point);
    mesh.material = material;
    mesh.isPickable = false;
    particles.push({ mesh, velocity });
  }

  let age = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.04);
    age += delta;
    const progress = Math.min(age / 0.48, 1);

    for (const particle of particles) {
      particle.velocity.y -= 5.2 * delta;
      particle.mesh.position.addInPlace(particle.velocity.scale(delta));
      particle.mesh.scaling.setAll(1 - progress * 0.72);
    }
    material.alpha = (kind === "dust" ? 0.5 : 0.82) * (1 - progress);

    if (progress >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      for (const particle of particles) {
        particle.mesh.dispose();
      }
      material.dispose();
    }
  });
}
