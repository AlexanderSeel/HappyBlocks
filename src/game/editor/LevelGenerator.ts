import type { HappyBlocksLevel, LevelEntity } from "../levels/types";

export type GeneratorTemplate = "tower" | "bridge" | "domino" | "fortress" | "chaos";
export interface LevelGeneratorOptions { template: GeneratorTemplate; seed: string; complexity: number; }

function hashSeed(seed: string): number { let hash = 2166136261; for (let i=0;i<seed.length;i+=1){ hash ^= seed.charCodeAt(i); hash = Math.imul(hash,16777619); } return hash>>>0; }
function mulberry32(seed:number):()=>number { let state=seed>>>0; return()=>{ state+=0x6d2b79f5; let v=state; v=Math.imul(v^(v>>>15),v|1); v^=v+Math.imul(v^(v>>>7),v|61); return((v^(v>>>14))>>>0)/4294967296; }; }

export function generateLevel(source:HappyBlocksLevel, options:LevelGeneratorOptions):HappyBlocksLevel {
  const complexity=Math.max(1,Math.min(8,Math.round(options.complexity)));
  const random=mulberry32(hashSeed(options.seed||"happyblocks"));
  const entities:LevelEntity[]=[]; let counter=0;
  const add=(asset:string,material:string,position:[number,number,number],rotation:[number,number,number]=[0,0,0],tags:string[]=[],motion:"STATIC"|"DYNAMIC"="DYNAMIC",scale:[number,number,number]=[1,1,1]):LevelEntity=>{
    const e:LevelEntity={id:`generated-${++counter}`,asset,material,position,rotation,scale,motion,tags}; entities.push(e); return e;
  };
  const target=(p:[number,number,number])=>add("target.totem","ceramic_violet",p,[0,0,0],["target"]);
  const column=(x:number,z:number,floors:number,a:string,b:string)=>{
    for(let floor=0;floor<floors;floor+=1){ const y=.5+floor*1.1;
      add("block.cube",floor%2?a:b,[x-.72,y,z]); add("block.cube",floor%2?b:a,[x+.72,y,z]);
      add("block.plank","wood",[x,y+.58,z],[0,floor%2?.05:-.05,0]);
      if(floor%2===0&&complexity>=4) add("block.rod","metal",[x,y+.2,z-.48],[Math.PI/2,0,Math.PI/2],["brace"],"DYNAMIC",[.75,.75,.75]);
    }
  };

  if(options.template==="tower"){
    const floors=3+complexity; column(-1.45,0,floors,"stone","ceramic_cyan"); column(1.45,0,floors,"stone","ceramic_amber");
    for(let floor=1;floor<floors;floor+=2) add("block.slab","metal",[0,floor*1.1+.35,0],[0,0,0],["skybridge"],"DYNAMIC",[1.15,1,.85]);
    if(complexity>=5){ add("spinner.cross","metal",[0,2.7,-1.25],[0,0,0],["mechanism"]); add("breakable.column","ceramic_cyan",[0,1.2,1.25],[0,0,0],["breakable"]); }
    target([0,floors*1.1+.75,0]);
  } else if(options.template==="bridge"){
    const spans=3+complexity, spacing=1.45, start=-((spans-1)*spacing)/2;
    for(let i=0;i<spans;i+=1){ const x=start+i*spacing; add("block.pillar",i%2?"stone":"ceramic_cyan",[x,1.05,0]); add("block.pillar",i%2?"stone":"ceramic_amber",[x,1.05,1.65]); add("block.plank","metal",[x,2.25,.82],[0,0,Math.PI/2],["crossbeam"],"DYNAMIC",[.72,1,1]); if(i<spans-1){ add("block.plank","wood",[x+spacing/2,2.35,0],[0,0,0],["deck"]); add("block.plank","wood",[x+spacing/2,2.35,1.65],[0,0,0],["deck"]); add("block.rod","metal",[x+spacing/2,3.05,.82],[0,0,Math.PI/2],["truss"],"DYNAMIC",[.8,.8,.8]); } }
    if(complexity>=4){ add("spinner.cross","metal",[0,1.25,-1.45],[0,0,0],["mechanism"]); add("bumper.round","rubber",[2.2,.22,-1.2],[0,0,0],["bumper"],"STATIC"); }
    target([0,2.95,.82]);
  } else if(options.template==="domino"){
    const count=12+complexity*5; for(let i=0;i<count;i+=1){ const t=i/Math.max(1,count-1), angle=t*Math.PI*2.3, radius=1.4+t*(2.6+complexity*.15); add(i%7===0?"breakable.column":"block.rod",i%3===0?"ceramic_cyan":i%3===1?"wood":"stone",[Math.cos(angle)*radius,i%7===0?1.2:1.35,Math.sin(angle)*radius],[0,-angle+Math.PI/2,0],i%7===0?["breakable"]:["domino"]); }
    add("bumper.round","rubber",[0,.22,0],[0,0,0],["bumper"],"STATIC"); target([Math.cos(Math.PI*2.3)*(4+complexity*.15),.7,Math.sin(Math.PI*2.3)*(4+complexity*.15)]);
  } else if(options.template==="fortress"){
    const half=2.2+complexity*.18, floors=2+Math.ceil(complexity/2); const corners:Array<[number,number]>=[[-half,-half],[half,-half],[-half,half],[half,half]];
    for(const [x,z] of corners){ column(x,z,floors,"stone","ceramic_amber"); add("block.slab","metal",[x,floors*1.12+.4,z],[0,0,0],["battlement"],"DYNAMIC",[1.25,1,1.25]); }
    for(const side of [-1,1]) for(let i=-2;i<=2;i+=1){ const off=i*(half/2.5); add("block.pillar","stone",[off,1.05,side*half],[0,0,0],["wall"]); add("block.pillar","stone",[side*half,1.05,off],[0,0,0],["wall"]); if(i<2){ add("block.plank","wood",[off+half/5,2.18,side*half],[0,0,0],["wall"]); add("block.plank","wood",[side*half,2.18,off+half/5],[0,Math.PI/2,0],["wall"]); } }
    add("breakable.column","ceramic_cyan",[0,1.2,-half],[0,0,0],["gate","breakable"]); add("spinner.cross","metal",[0,2.5,-half-.55],[0,0,0],["mechanism"]); add("goal.energyCore","energy",[0,.48,0],[0,0,0],["protected-core"]); target([0,1.15,half*.35]);
  } else {
    const districts=2+Math.ceil(complexity/2); for(let d=0;d<districts;d+=1){ const angle=d/districts*Math.PI*2,cx=Math.cos(angle)*(2.3+complexity*.25),cz=Math.sin(angle)*(2.3+complexity*.25),floors=2+Math.floor(random()*(2+complexity/2)); column(cx,cz,floors,d%2?"stone":"ceramic_cyan",d%2?"ceramic_amber":"wood"); if(d%2===0) add("block.wedge","metal",[cx,floors*1.12+.7,cz],[0,random()*Math.PI,0],["roof"],"DYNAMIC",[1.3,1,1.3]); }
    for(let i=0;i<3+complexity;i+=1){ const a=random()*Math.PI*2,r=1+random()*4.8; add("bumper.round","rubber",[Math.cos(a)*r,.22,Math.sin(a)*r],[0,0,0],["bumper"],"STATIC"); }
    add("spinner.cross","metal",[0,2.1,-1.4],[0,0,0],["mechanism"]); target([0,3.3+complexity*.18,0]);
  }

  const generated=JSON.parse(JSON.stringify(source)) as HappyBlocksLevel;
  generated.id=`generated-${options.template}-${options.seed||"seed"}`.toLowerCase().replace(/[^a-z0-9-]+/g,"-").slice(0,80);
  generated.name=`Generated ${options.template[0].toUpperCase()}${options.template.slice(1)}`;
  generated.mode=options.template==="domino"||options.template==="chaos"?"chainReaction":"throw";
  generated.entities=entities;
  generated.inventory={"projectile.ball":Math.max(3,Math.ceil(complexity/2)+1),"projectile.heavy":complexity>=2?2:1,"projectile.pulse":complexity>=4?1:0};
  generated.objectives=[{type:"knockDown",targetTag:"target",maxUpDot:.52,required:1}];
  generated.scoring={base:1500+complexity*240,projectilePenalty:170+complexity*10,impactComboWindowMs:950,comboMultiplier:1.2,starThresholds:[700+complexity*100,1100+complexity*145,1500+complexity*190]};
  return generated;
}
