import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  GizmoManager,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Quaternion,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { ASSETS } from "../AssetDefinitions";
import type { HappyBlocksLevel, LevelEntity } from "../levels/types";
import { createDetailedVisual } from "../rendering/DetailedVisualFactory";
import { createMaterialLibrary, type MaterialLibrary } from "../rendering/materials";

export type EditorGizmoMode = "position" | "rotation" | "scale";
export interface EditorTransform { position:[number,number,number]; rotation:[number,number,number]; scale:[number,number,number]; }
export interface EditorViewportCallbacks { onSelection:(entityId:string|null)=>void; onTransform:(entityId:string,transform:EditorTransform)=>void; }

export class EditorViewport {
  private readonly engine:Engine; private readonly scene:Scene; private readonly camera:ArcRotateCamera; private readonly gizmos:GizmoManager;
  private readonly meshes=new Map<string,Mesh>(); private readonly visuals=new Map<string,AbstractMesh[]>(); private readonly surfaceMaterials:MaterialLibrary; private readonly resizeObserver:ResizeObserver;
  private selectedId:string|null=null; private mode:EditorGizmoMode="position"; private lastTransformHash=""; private disposed=false;

  constructor(private readonly canvas:HTMLCanvasElement,private readonly callbacks:EditorViewportCallbacks){
    this.engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:true}); this.scene=new Scene(this.engine); this.scene.clearColor=new Color4(.018,.045,.055,1);
    this.camera=new ArcRotateCamera("editor-camera",-1.45,1.08,11,new Vector3(0,1.5,0),this.scene); this.camera.lowerRadiusLimit=1.5; this.camera.upperRadiusLimit=40; this.camera.wheelPrecision=35; this.camera.panningSensibility=70; this.camera.attachControl(canvas,true);
    const light=new HemisphericLight("editor-light",new Vector3(.35,1,-.2),this.scene); light.intensity=1.15; light.groundColor=new Color3(.08,.11,.12);
    this.surfaceMaterials=createMaterialLibrary(this.scene); const grid=MeshBuilder.CreateGround("editor-grid",{width:80,height:80,subdivisions:1},this.scene); grid.material=this.surfaceMaterials.platform; grid.isPickable=false;
    this.gizmos=new GizmoManager(this.scene); this.gizmos.usePointerToAttachGizmos=false; this.applyGizmoMode();
    this.scene.onPointerObservable.add(info=>{if(info.type!==PointerEventTypes.POINTERDOWN)return;const event=info.event as PointerEvent;if(event.button!==0||this.gizmos.isHovered)return;const entityId=info.pickInfo?.pickedMesh?.metadata?.happyBlocksEditorId as string|undefined;this.select(entityId??null,true);});
    this.scene.onBeforeRenderObservable.add(()=>this.syncSelectedTransform()); this.engine.runRenderLoop(()=>{if(!this.disposed&&!this.canvas.closest("[hidden]"))this.scene.render();}); this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(canvas);
  }

  setLevel(level:HappyBlocksLevel,preferredSelection?:string|null):void{this.gizmos.attachToMesh(null);this.meshes.forEach(mesh=>mesh.dispose());this.meshes.clear();this.visuals.clear();this.selectedId=null;this.lastTransformHash="";for(const entity of level.entities){const mesh=this.createEntityMesh(entity);this.meshes.set(entity.id,mesh);}this.camera.target.copyFromFloats(...level.camera.target);this.camera.radius=Math.min(32,Math.max(2,level.camera.radius));const selection=preferredSelection&&this.meshes.has(preferredSelection)?preferredSelection:level.entities[0]?.id??null;this.select(selection,false);this.resize();}
  select(entityId:string|null,emit=false):void{this.selectedId=entityId&&this.meshes.has(entityId)?entityId:null;const mesh=this.selectedId?this.meshes.get(this.selectedId)??null:null;this.gizmos.attachToMesh(mesh);this.lastTransformHash=mesh?this.hashTransform(mesh):"";this.meshes.forEach((candidate,id)=>{const selected=id===this.selectedId;const visuals=this.visuals.get(id);if(visuals?.length)visuals.forEach(visual=>{visual.showBoundingBox=selected;});else candidate.showBoundingBox=selected;});if(emit)this.callbacks.onSelection(this.selectedId);}
  setMode(mode:EditorGizmoMode):void{this.mode=mode;this.applyGizmoMode();}
  updateEntity(entity:LevelEntity):void{const mesh=this.meshes.get(entity.id);if(!mesh)return;this.applyTransform(mesh,{position:[...entity.position],rotation:[...(entity.rotation??[0,0,0])],scale:[...(entity.scale??[1,1,1])]});const material=this.materialFor(entity.material??"wood");mesh.material=material;this.visuals.get(entity.id)?.forEach(visual=>{visual.material=material;});this.lastTransformHash=this.hashTransform(mesh);}
  resize():void{if(!this.disposed)this.engine.resize();}
  dispose():void{this.disposed=true;this.resizeObserver.disconnect();this.gizmos.dispose();Object.values(this.surfaceMaterials).forEach(material=>material.dispose());this.scene.dispose();this.engine.dispose();}

  private createEntityMesh(entity:LevelEntity):Mesh{const definition=ASSETS[entity.asset];if(!definition)throw new Error(`Unknown editor asset '${entity.asset}'.`);const[width,height,depth]=definition.dimensions;let mesh:Mesh;if(definition.kind==="sphere")mesh=MeshBuilder.CreateSphere(`editor:${entity.id}`,{diameter:definition.radius!*2,segments:20},this.scene);else if(definition.kind==="cylinder")mesh=MeshBuilder.CreateCylinder(`editor:${entity.id}`,{height,diameter:definition.radius!*2,tessellation:24},this.scene);else if(definition.kind==="capsule")mesh=MeshBuilder.CreateCapsule(`editor:${entity.id}`,{height,radius:definition.radius!,tessellation:20},this.scene);else mesh=MeshBuilder.CreateBox(`editor:${entity.id}`,{width,height,depth},this.scene);mesh.metadata={happyBlocksEditorId:entity.id};const material=this.materialFor(entity.material??"wood");mesh.material=material;mesh.isPickable=true;this.applyTransform(mesh,{position:[...entity.position],rotation:[...(entity.rotation??[0,0,0])],scale:[...(entity.scale??[1,1,1])]});const detailed=createDetailedVisual(this.scene,entity.asset,mesh,material,entity.id);if(detailed?.meshes.length){mesh.isVisible=false;this.visuals.set(entity.id,detailed.meshes);}return mesh;}
  private materialFor(materialId:string){return this.surfaceMaterials[materialId]??this.surfaceMaterials.wood;}
  private applyGizmoMode():void{this.gizmos.positionGizmoEnabled=this.mode==="position";this.gizmos.rotationGizmoEnabled=this.mode==="rotation";this.gizmos.scaleGizmoEnabled=this.mode==="scale";}
  private syncSelectedTransform():void{if(!this.selectedId)return;const mesh=this.meshes.get(this.selectedId);if(!mesh)return;const hash=this.hashTransform(mesh);if(hash===this.lastTransformHash)return;this.lastTransformHash=hash;const rotation=mesh.rotationQuaternion?.toEulerAngles()??mesh.rotation;this.callbacks.onTransform(this.selectedId,{position:[mesh.position.x,mesh.position.y,mesh.position.z],rotation:[rotation.x,rotation.y,rotation.z],scale:[mesh.scaling.x,mesh.scaling.y,mesh.scaling.z]});}
  private applyTransform(mesh:Mesh,transform:EditorTransform):void{mesh.position.copyFromFloats(...transform.position);mesh.rotationQuaternion=Quaternion.FromEulerAngles(...transform.rotation);mesh.scaling.copyFromFloats(...transform.scale);mesh.computeWorldMatrix(true);}
  private hashTransform(mesh:Mesh):string{const rotation=mesh.rotationQuaternion?.toEulerAngles()??mesh.rotation;return[mesh.position.x,mesh.position.y,mesh.position.z,rotation.x,rotation.y,rotation.z,mesh.scaling.x,mesh.scaling.y,mesh.scaling.z].map(value=>value.toFixed(4)).join("|");}
}
