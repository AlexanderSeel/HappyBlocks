import type { HappyBlocksLevel } from "./types";
export async function loadLevel(url:string):Promise<HappyBlocksLevel>{ const response=await fetch(url); if(!response.ok) throw new Error(`Unable to load level: ${url} (${response.status})`); return await response.json() as HappyBlocksLevel; }
