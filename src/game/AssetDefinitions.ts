import { PhysicsShapeType } from "@babylonjs/core";
export interface AssetDefinition{kind:"box"|"sphere"|"cylinder"|"wedge"|"compound";dimensions:[number,number,number];radius?:number;physicsShape:PhysicsShapeType;mass:number;model:string;}
export const ASSETS:Record<string,AssetDefinition>={
"block.cube":{kind:"box",dimensions:[1,1,1],physicsShape:PhysicsShapeType.BOX,mass:1.3,model:"/assets/models/block_cube.gltf"},
"block.long":{kind:"box",dimensions:[2,1,1],physicsShape:PhysicsShapeType.BOX,mass:2.1,model:"/assets/models/block_long.gltf"},
"block.plank":{kind:"box",dimensions:[3,.36,.72],physicsShape:PhysicsShapeType.BOX,mass:1.5,model:"/assets/models/block_plank.gltf"},
"block.pillar":{kind:"box",dimensions:[.8,2.1,.8],physicsShape:PhysicsShapeType.BOX,mass:3.3,model:"/assets/models/block_pillar.gltf"},
"block.slab":{kind:"box",dimensions:[2.5,.35,1.5],physicsShape:PhysicsShapeType.BOX,mass:3,model:"/assets/models/block_slab.gltf"},
"block.rod":{kind:"box",dimensions:[.35,2.7,.35],physicsShape:PhysicsShapeType.BOX,mass:1.2,model:"/assets/models/block_rod.gltf"},
"block.cylinder":{kind:"cylinder",dimensions:[1,1,1],radius:.5,physicsShape:PhysicsShapeType.CYLINDER,mass:1.4,model:"/assets/models/block_cylinder.gltf"},
"goal.energyCore":{kind:"sphere",dimensions:[.9,.9,.9],radius:.45,physicsShape:PhysicsShapeType.SPHERE,mass:1,model:"/assets/models/goal_energy_core.gltf"},
"target.totem":{kind:"cylinder",dimensions:[.75,1.4,.75],radius:.375,physicsShape:PhysicsShapeType.CYLINDER,mass:1.4,model:"/assets/models/target_totem.gltf"},
"breakable.column":{kind:"box",dimensions:[.8,2.4,.8],physicsShape:PhysicsShapeType.BOX,mass:3,model:"/assets/models/breakable_column.gltf"},
"spinner.cross":{kind:"box",dimensions:[2.8,.3,.55],physicsShape:PhysicsShapeType.BOX,mass:2,model:"/assets/models/spinner_cross.gltf"},
"projectile.ball":{kind:"sphere",dimensions:[.76,.76,.76],radius:.38,physicsShape:PhysicsShapeType.SPHERE,mass:1.8,model:"/assets/models/projectile_ball.gltf"},
"projectile.heavy":{kind:"sphere",dimensions:[1.04,1.04,1.04],radius:.52,physicsShape:PhysicsShapeType.SPHERE,mass:4.6,model:"/assets/models/projectile_heavy_ball.gltf"}
};
