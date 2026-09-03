import { PhysicsBody, Scene, Vector3 } from "@babylonjs/core";

interface StagedScene {
  armed: boolean;
  bodies: Set<PhysicsBody>;
}

const stagedScenes = new WeakMap<Scene, StagedScene>();

function state(scene: Scene): StagedScene {
  let value = stagedScenes.get(scene);
  if (!value) {
    value = { armed: false, bodies: new Set<PhysicsBody>() };
    stagedScenes.set(scene, value);
    scene.onDisposeObservable.addOnce(() => stagedScenes.delete(scene));
  }
  return value;
}

/**
 * Keep authored structures fully collidable while preventing gravity and
 * initial solver noise from making them collapse before the player's first
 * real interaction. Bodies are released as one group on the first impact/pull.
 */
export function stageInitialBody(scene: Scene, body: PhysicsBody): void {
  const staged = state(scene);
  if (staged.armed) return;
  staged.bodies.add(body);
  body.setGravityFactor(0);
  body.setLinearVelocity(Vector3.Zero());
  body.setAngularVelocity(Vector3.Zero());
  body.startAsleep = true;
}

export function armInitialPhysics(scene: Scene): boolean {
  const staged = state(scene);
  if (staged.armed) return false;
  staged.armed = true;
  for (const body of staged.bodies) {
    if (body.isDisposed) continue;
    body.setGravityFactor(1);
    // Havok wakes sleeping bodies when a force is applied; a zero force keeps
    // the player's collision response intact while ensuring unsupported pieces
    // immediately begin reacting to gravity.
    body.applyForce(Vector3.Zero(), body.getObjectCenterWorld());
  }
  staged.bodies.clear();
  return true;
}

export function initialPhysicsArmed(scene: Scene): boolean {
  return state(scene).armed;
}
