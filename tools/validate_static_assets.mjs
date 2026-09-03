#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${relative(root, path)}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function assertFile(path, label) {
  if (!existsSync(path)) fail(`${label}: missing ${relative(root, path)}`);
}

const assetSourcePath = join(root, "src/game/AssetDefinitions.ts");
const assetSource = readFileSync(assetSourcePath, "utf8");
const runtimeAssets = new Map();
for (const match of assetSource.matchAll(/^\s*"([^"]+)":\s*\{[^\n]*model:\s*"([^"]+)"/gm)) {
  runtimeAssets.set(match[1], match[2]);
}
if (runtimeAssets.size < 10) {
  fail(`AssetDefinitions.ts: parsed only ${runtimeAssets.size} runtime assets; validator regex likely needs updating`);
}

for (const [assetId, modelUrl] of runtimeAssets) {
  const modelPath = join(root, "public", modelUrl.replace(/^\//, ""));
  assertFile(modelPath, `runtime asset ${assetId}`);
}

const publicAssetManifestPath = join(root, "public/assets/asset-manifest.json");
const publicAssetManifest = readJson(publicAssetManifestPath);
if (publicAssetManifest) {
  const manifestIds = new Set();
  for (const asset of publicAssetManifest.assets ?? []) {
    if (!asset?.id || !asset?.file) {
      fail("public/assets/asset-manifest.json: every asset requires id + file");
      continue;
    }
    if (manifestIds.has(asset.id)) fail(`asset manifest: duplicate id '${asset.id}'`);
    manifestIds.add(asset.id);
    assertFile(join(root, "public", asset.file), `asset manifest ${asset.id}`);
  }
  for (const assetId of runtimeAssets.keys()) {
    if (!manifestIds.has(assetId)) fail(`runtime asset '${assetId}' is missing from public asset-manifest.json`);
  }
  const manifestOnly = [...manifestIds].filter((id) => !runtimeAssets.has(id));
  if (manifestOnly.length) notes.push(`manifest-only assets: ${manifestOnly.join(", ")}`);
}

const textureManifestPath = join(root, "public/assets/textures/pbr/manifest.json");
const textureManifest = readJson(textureManifestPath);
if (textureManifest) {
  if (textureManifest.version !== 2) fail(`PBR manifest: expected version 2, got ${textureManifest.version}`);
  const requiredProfiles = ["hd", "mobile"];
  const requiredMaterials = ["wood", "stone", "metal", "rubber", "ceramic", "energy"];
  const requiredChannels = ["baseColor", "normal", "orm"];
  for (const profileName of requiredProfiles) {
    const profile = textureManifest.profiles?.[profileName];
    if (!profile) {
      fail(`PBR manifest: missing '${profileName}' profile`);
      continue;
    }
    for (const materialId of requiredMaterials) {
      const material = profile.materials?.[materialId];
      if (!material) {
        fail(`PBR manifest: ${profileName} missing '${materialId}' material`);
        continue;
      }
      for (const channel of requiredChannels) {
        const filename = material[channel];
        if (!filename) fail(`PBR manifest: ${profileName}.${materialId} missing ${channel}`);
        else assertFile(join(root, "public/assets/textures/pbr", filename), `PBR ${profileName}.${materialId}.${channel}`);
      }
      if (materialId === "energy") {
        if (!material.emissive) fail(`PBR manifest: ${profileName}.energy missing emissive`);
        else assertFile(join(root, "public/assets/textures/pbr", material.emissive), `PBR ${profileName}.energy.emissive`);
      }
    }
  }
}

const levelDir = join(root, "public/levels");
const levelFiles = readdirSync(levelDir)
  .filter((name) => name.endsWith(".json"))
  .sort();
const levelIds = new Set();
let entityCount = 0;

for (const filename of levelFiles) {
  const levelPath = join(levelDir, filename);
  const level = readJson(levelPath);
  if (!level) continue;
  const label = `level ${filename}`;

  if (typeof level.id !== "string" || !level.id) fail(`${label}: missing id`);
  else if (levelIds.has(level.id)) fail(`${label}: duplicate level id '${level.id}'`);
  else levelIds.add(level.id);

  if (typeof level.name !== "string" || !level.name) fail(`${label}: missing name`);
  if (!runtimeAssets.has(level.arena?.platform)) fail(`${label}: unknown arena platform '${level.arena?.platform}'`);
  if (!isFiniteVec3(level.arena?.gravity)) fail(`${label}: arena.gravity must be a finite vec3`);
  if (!isFiniteVec3(level.camera?.target)) fail(`${label}: camera.target must be a finite vec3`);
  if (!Number.isFinite(level.camera?.radius) || level.camera.radius <= 0) fail(`${label}: camera.radius must be > 0`);
  if (!Array.isArray(level.entities)) {
    fail(`${label}: entities must be an array`);
    continue;
  }
  if (!Array.isArray(level.objectives)) fail(`${label}: objectives must be an array`);

  const entityIds = new Set();
  const tagCounts = new Map();
  for (const entity of level.entities) {
    entityCount += 1;
    if (!entity?.id) {
      fail(`${label}: entity without id`);
      continue;
    }
    if (entityIds.has(entity.id)) fail(`${label}: duplicate entity id '${entity.id}'`);
    entityIds.add(entity.id);
    if (!runtimeAssets.has(entity.asset)) fail(`${label}/${entity.id}: unknown runtime asset '${entity.asset}'`);
    if (!isFiniteVec3(entity.position)) fail(`${label}/${entity.id}: position must be a finite vec3`);
    if (entity.rotation !== undefined && !isFiniteVec3(entity.rotation)) fail(`${label}/${entity.id}: rotation must be a finite vec3`);
    if (entity.scale !== undefined && (!isFiniteVec3(entity.scale) || entity.scale.some((value) => value <= 0))) {
      fail(`${label}/${entity.id}: scale must be a positive finite vec3`);
    }
    if (!["STATIC", "DYNAMIC"].includes(entity.motion)) fail(`${label}/${entity.id}: motion must be STATIC or DYNAMIC`);
    for (const tag of entity.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  for (const [assetId, count] of Object.entries(level.inventory ?? {})) {
    if (!runtimeAssets.has(assetId) || !assetId.startsWith("projectile.")) fail(`${label}: inventory key '${assetId}' is not a projectile runtime asset`);
    if (!Number.isInteger(count) || count < 0) fail(`${label}: inventory '${assetId}' must be a non-negative integer`);
  }

  for (const objective of level.objectives ?? []) {
    if (typeof objective?.type !== "string") fail(`${label}: objective missing type`);
    if ("targetTag" in (objective ?? {}) && typeof objective.targetTag === "string" && !tagCounts.has(objective.targetTag)) {
      fail(`${label}: objective '${objective.type}' targets missing tag '${objective.targetTag}'`);
    }
  }

  const thresholds = level.scoring?.starThresholds;
  if (
    thresholds !== undefined &&
    (!Array.isArray(thresholds) ||
      thresholds.length !== 3 ||
      thresholds.some((value) => !Number.isFinite(value)) ||
      !(thresholds[0] < thresholds[1] && thresholds[1] < thresholds[2]))
  ) {
    fail(`${label}: scoring.starThresholds must contain three strictly ascending finite values`);
  }
}

if (errors.length) {
  console.error(`Static content validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Validated ${runtimeAssets.size} runtime assets, ${levelFiles.length} levels, ${entityCount} level entities, and both PBR profiles.`);
for (const note of notes) console.log(`Note: ${note}`);
