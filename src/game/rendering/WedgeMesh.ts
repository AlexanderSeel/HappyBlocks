import { Mesh, MeshBuilder, Scene } from "@babylonjs/core";

const WEDGE_POLYHEDRON = {
  vertex: [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
  ],
  face: [
    [0, 1, 3, 2],
    [0, 4, 5, 1],
    [0, 2, 4],
    [1, 5, 3],
    [2, 3, 5, 4],
  ],
};

/**
 * Creates a triangular-prism ramp whose bounding box exactly matches the
 * supplied dimensions. The slope runs from high at -Z to low at +Z.
 *
 * This primitive is deliberately shared by gameplay, editor and detailed
 * visuals so the Havok convex hull and what the player sees stay aligned.
 */
export function createWedgeMesh(
  name: string,
  dimensions: readonly [number, number, number],
  scene: Scene,
): Mesh {
  const [width, height, depth] = dimensions;
  return MeshBuilder.CreatePolyhedron(
    name,
    {
      custom: WEDGE_POLYHEDRON,
      sizeX: width,
      sizeY: height,
      sizeZ: depth,
      flat: true,
    },
    scene,
  );
}
