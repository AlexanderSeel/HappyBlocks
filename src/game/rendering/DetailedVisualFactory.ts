import {
  AbstractMesh,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { ASSETS } from "../AssetDefinitions";

export interface DetailedVisual {
  meshes: AbstractMesh[];
  dispose: () => void;
}

function finish(scene: Scene, parts: Mesh[], parent: TransformNode, material: Material, instanceName: string): DetailedVisual | null {
  if (parts.length === 0) return null;
  for (const part of parts) { part.material = material; part.isPickable = true; part.receiveShadows = true; }
  const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  if (!merged) return null;
  merged.name = `${instanceName}:detail`;
  merged.parent = parent;
  merged.material = material;
  merged.isPickable = true;
  merged.receiveShadows = true;
  merged.metadata = { happyBlocksEntityId: instanceName, happyBlocksEditorId: instanceName };
  return { meshes: [merged], dispose: () => merged.dispose() };
}

function bolt(scene: Scene, name: string, radius: number, position: Vector3): Mesh {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter: radius * 2, height: radius * 0.55, tessellation: 12 }, scene);
  mesh.position.copyFrom(position);
  return mesh;
}

function detailedBox(scene: Scene, assetId: string, parent: TransformNode, material: Material, instanceName: string): DetailedVisual | null {
  const definition = ASSETS[assetId];
  const [w, h, d] = definition.dimensions;
  const parts: Mesh[] = [MeshBuilder.CreateBox(`${instanceName}:body`, { width: w * 0.96, height: h * 0.96, depth: d * 0.96 }, scene)];
  const plateDepth = Math.max(0.016, Math.min(w, h, d) * 0.025);
  const plateW = Math.max(0.08, w * 0.68);
  const plateD = Math.max(0.08, d * 0.68);
  for (const y of [-h * 0.492, h * 0.492]) {
    const plate = MeshBuilder.CreateBox(`${instanceName}:plate`, { width: plateW, height: plateDepth, depth: plateD }, scene);
    plate.position.y = y; parts.push(plate);
  }
  const rail = Math.max(0.025, Math.min(w, h, d) * 0.055);
  const railY = h * 0.49;
  for (const z of [-d * 0.43, d * 0.43]) { const r=MeshBuilder.CreateBox(`${instanceName}:rail`,{width:w*.84,height:rail,depth:rail},scene); r.position.copyFromFloats(0,railY,z); parts.push(r); }
  for (const x of [-w * 0.43, w * 0.43]) { const r=MeshBuilder.CreateBox(`${instanceName}:rail`,{width:rail,height:rail,depth:d*.84},scene); r.position.copyFromFloats(x,railY,0); parts.push(r); }
  const br = Math.max(0.022, Math.min(w, h, d) * 0.045);
  for (const x of [-w*.32,w*.32]) for (const z of [-d*.32,d*.32]) parts.push(bolt(scene,`${instanceName}:bolt`,br,new Vector3(x,h*.505,z)));
  if (assetId === "breakable.column") for (const y of [-h*.28,0,h*.28]) { const band=MeshBuilder.CreateBox(`${instanceName}:band`,{width:w*1.05,height:Math.max(.045,h*.035),depth:d*1.05},scene); band.position.y=y; parts.push(band); }
  return finish(scene, parts, parent, material, instanceName);
}

function detailedCylinder(scene: Scene, assetId: string, parent: TransformNode, material: Material, instanceName: string): DetailedVisual | null {
  const def=ASSETS[assetId], radius=def.radius??def.dimensions[0]/2, h=def.dimensions[1];
  const parts:Mesh[]=[MeshBuilder.CreateCylinder(`${instanceName}:body`,{diameter:radius*1.92,height:h*.96,tessellation:36},scene)];
  for(const y of [-h*.49,h*.49]){ const ring=MeshBuilder.CreateTorus(`${instanceName}:ring`,{diameter:radius*1.62,thickness:Math.max(.035,radius*.11),tessellation:36},scene); ring.position.y=y; parts.push(ring); }
  if(assetId==="bumper.round"){ const outer=MeshBuilder.CreateTorus(`${instanceName}:rubber-ring`,{diameter:radius*1.55,thickness:radius*.24,tessellation:42},scene); outer.position.y=h*.46; parts.push(outer); parts.push(MeshBuilder.CreateCylinder(`${instanceName}:hub`,{diameter:radius*.42,height:h*1.15,tessellation:28},scene)); }
  if(assetId==="target.totem"){ const crown=MeshBuilder.CreateSphere(`${instanceName}:crown`,{diameter:radius*1.05,segments:24},scene); crown.position.y=h*.56; parts.push(crown); const halo=MeshBuilder.CreateTorus(`${instanceName}:halo`,{diameter:radius*1.5,thickness:radius*.1,tessellation:32},scene); halo.position.y=h*.56; halo.rotation.x=Math.PI/2; parts.push(halo); }
  return finish(scene,parts,parent,material,instanceName);
}

function detailedSphere(scene:Scene,assetId:string,parent:TransformNode,material:Material,instanceName:string):DetailedVisual|null{
  const radius=ASSETS[assetId].radius??.4; const parts:Mesh[]=[MeshBuilder.CreateSphere(`${instanceName}:body`,{diameter:radius*1.92,segments:32},scene)];
  const ringCount=assetId==="goal.energyCore"?3:2;
  for(let i=0;i<ringCount;i+=1){ const ring=MeshBuilder.CreateTorus(`${instanceName}:ring-${i}`,{diameter:radius*(assetId==="goal.energyCore"?2.1:1.62),thickness:Math.max(.022,radius*.07),tessellation:42},scene); if(i===1)ring.rotation.x=Math.PI/2;if(i===2)ring.rotation.z=Math.PI/2; parts.push(ring); }
  if(assetId==="projectile.heavy") for(let i=0;i<6;i+=1){ const angle=i/6*Math.PI*2; const b=MeshBuilder.CreateSphere(`${instanceName}:stud`,{diameter:radius*.13,segments:10},scene); b.position.copyFromFloats(Math.cos(angle)*radius*.72,0,Math.sin(angle)*radius*.72); parts.push(b); }
  return finish(scene,parts,parent,material,instanceName);
}

function detailedCapsule(scene:Scene,parent:TransformNode,material:Material,instanceName:string):DetailedVisual|null{
  const def=ASSETS["projectile.pulse"], radius=def.radius??.28,h=def.dimensions[1]; const parts:Mesh[]=[MeshBuilder.CreateCapsule(`${instanceName}:body`,{radius:radius*.95,height:h*.96,tessellation:24,subdivisions:4},scene)];
  for(const y of [-h*.18,h*.18]){ const ring=MeshBuilder.CreateTorus(`${instanceName}:ring`,{diameter:radius*1.65,thickness:radius*.1,tessellation:30},scene); ring.position.y=y; parts.push(ring); }
  return finish(scene,parts,parent,material,instanceName);
}

function detailedSpinner(scene:Scene,parent:TransformNode,material:Material,instanceName:string):DetailedVisual|null{
  const parts:Mesh[]=[MeshBuilder.CreateBox(`${instanceName}:bar-a`,{width:2.75,height:.25,depth:.48},scene),MeshBuilder.CreateBox(`${instanceName}:bar-b`,{width:.48,height:.25,depth:2.75},scene),MeshBuilder.CreateCylinder(`${instanceName}:hub`,{diameter:.68,height:.42,tessellation:32},scene)];
  const ring=MeshBuilder.CreateTorus(`${instanceName}:hub-ring`,{diameter:.78,thickness:.08,tessellation:32},scene); ring.position.y=.22; parts.push(ring); return finish(scene,parts,parent,material,instanceName);
}

export function createDetailedVisual(scene:Scene,assetId:string,parent:TransformNode,material:Material,instanceName:string):DetailedVisual|null{
  const def=ASSETS[assetId]; if(!def||assetId.startsWith("platform."))return null;
  if(assetId==="spinner.cross")return detailedSpinner(scene,parent,material,instanceName);
  if(def.kind==="sphere")return detailedSphere(scene,assetId,parent,material,instanceName);
  if(def.kind==="capsule")return detailedCapsule(scene,parent,material,instanceName);
  if(def.kind==="cylinder")return detailedCylinder(scene,assetId,parent,material,instanceName);
  return detailedBox(scene,assetId,parent,material,instanceName);
}
