import {
  DynamicTexture,
  Scene,
  Texture,
} from "@babylonjs/core";

export type TextureKitId = "wood" | "stone" | "metal" | "rubber" | "ceramic" | "energy";

export interface TextureKit {
  albedo: DynamicTexture;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function textureSize(): number {
  const constrained =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  return constrained ? 1024 : 2048;
}

function createTexture(
  scene: Scene,
  name: string,
  draw: (context: CanvasRenderingContext2D, size: number) => void,
): DynamicTexture {
  const size = textureSize();
  const texture = new DynamicTexture(
    name,
    { width: size, height: size },
    scene,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  const context = texture.getContext();
  draw(context, size);
  texture.update(false);
  return texture;
}

function drawWood(context: CanvasRenderingContext2D, size: number): void {
  const random = seeded(101);
  const gradient = context.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, "#63391d");
  gradient.addColorStop(0.35, "#b97b3e");
  gradient.addColorStop(0.72, "#8f562d");
  gradient.addColorStop(1, "#d59b55");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  context.globalAlpha = 0.24;
  for (let index = 0; index < 460; index += 1) {
    const y = random() * size;
    const wave = 5 + random() * 22;
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= size; x += size / 32) {
      context.lineTo(x, y + Math.sin(x * 0.018 + index) * wave);
    }
    context.strokeStyle = random() > 0.55 ? "#371b0b" : "#f0b96c";
    context.lineWidth = 0.6 + random() * 2.2;
    context.stroke();
  }
  context.globalAlpha = 0.4;
  for (let knot = 0; knot < 12; knot += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = size * (0.012 + random() * 0.025);
    context.strokeStyle = "#3e210f";
    for (let ring = 1; ring < 5; ring += 1) {
      context.beginPath();
      context.ellipse(x, y, radius * ring * 1.6, radius * ring, random() * 0.8, 0, Math.PI * 2);
      context.lineWidth = 1.2;
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}

function drawStone(context: CanvasRenderingContext2D, size: number): void {
  const random = seeded(202);
  context.fillStyle = "#929da1";
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 9000; index += 1) {
    const shade = Math.floor(105 + random() * 105);
    const alpha = 0.05 + random() * 0.18;
    context.fillStyle = `rgba(${shade},${shade + 4},${shade + 7},${alpha})`;
    const radius = 0.5 + random() * 5;
    context.fillRect(random() * size, random() * size, radius, radius);
  }
  context.globalAlpha = 0.22;
  context.strokeStyle = "#485156";
  for (let crack = 0; crack < 34; crack += 1) {
    let x = random() * size;
    let y = random() * size;
    context.beginPath();
    context.moveTo(x, y);
    for (let segment = 0; segment < 8; segment += 1) {
      x += (random() - 0.5) * size * 0.055;
      y += random() * size * 0.028;
      context.lineTo(x, y);
    }
    context.lineWidth = 0.5 + random() * 1.8;
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawMetal(context: CanvasRenderingContext2D, size: number): void {
  const random = seeded(303);
  const gradient = context.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, "#46555c");
  gradient.addColorStop(0.2, "#9aa9ae");
  gradient.addColorStop(0.5, "#5d7078");
  gradient.addColorStop(0.82, "#b6c1c5");
  gradient.addColorStop(1, "#53646b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.globalAlpha = 0.18;
  for (let line = 0; line < 1300; line += 1) {
    const x = random() * size;
    context.strokeStyle = random() > 0.5 ? "#eef6f7" : "#1e2a2f";
    context.lineWidth = 0.35 + random() * 0.8;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + (random() - 0.5) * 8, size);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawRubber(context: CanvasRenderingContext2D, size: number): void {
  const random = seeded(404);
  context.fillStyle = "#131e22";
  context.fillRect(0, 0, size, size);
  for (let dot = 0; dot < 22000; dot += 1) {
    const alpha = 0.05 + random() * 0.16;
    const light = 32 + Math.floor(random() * 35);
    context.fillStyle = `rgba(${light},${light + 5},${light + 7},${alpha})`;
    const radius = 0.5 + random() * 2.4;
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawCeramic(context: CanvasRenderingContext2D, size: number): void {
  const random = seeded(505);
  const gradient = context.createRadialGradient(size * 0.32, size * 0.25, 0, size * 0.5, size * 0.5, size * 0.85);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#e8eeee");
  gradient.addColorStop(1, "#bfcaca");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.globalAlpha = 0.22;
  for (let dot = 0; dot < 5000; dot += 1) {
    const light = 135 + Math.floor(random() * 75);
    context.fillStyle = `rgb(${light},${light + 3},${light + 5})`;
    context.fillRect(random() * size, random() * size, 0.5 + random() * 2, 0.5 + random() * 2);
  }
  context.globalAlpha = 1;
}

function drawEnergy(context: CanvasRenderingContext2D, size: number): void {
  const random = seeded(606);
  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.72);
  gradient.addColorStop(0, "#fff0a4");
  gradient.addColorStop(0.28, "#f29d32");
  gradient.addColorStop(0.58, "#2a8498");
  gradient.addColorStop(1, "#102d36");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "screen";
  context.globalAlpha = 0.55;
  context.strokeStyle = "#80efff";
  context.lineWidth = Math.max(1, size / 1024);
  const cell = size / 24;
  for (let index = 0; index <= 24; index += 1) {
    context.beginPath();
    context.moveTo(index * cell, 0);
    context.lineTo(index * cell, size);
    context.stroke();
    context.beginPath();
    context.moveTo(0, index * cell);
    context.lineTo(size, index * cell);
    context.stroke();
  }
  for (let ring = 1; ring <= 9; ring += 1) {
    context.beginPath();
    context.arc(size / 2, size / 2, (size * ring) / 22, 0, Math.PI * 2);
    context.strokeStyle = ring % 2 ? "#fff2a1" : "#68e7ff";
    context.globalAlpha = 0.18 + random() * 0.3;
    context.stroke();
  }
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
}

export function createTextureKits(scene: Scene): Record<TextureKitId, TextureKit> {
  return {
    wood: { albedo: createTexture(scene, "kit-wood-albedo", drawWood) },
    stone: { albedo: createTexture(scene, "kit-stone-albedo", drawStone) },
    metal: { albedo: createTexture(scene, "kit-metal-albedo", drawMetal) },
    rubber: { albedo: createTexture(scene, "kit-rubber-albedo", drawRubber) },
    ceramic: { albedo: createTexture(scene, "kit-ceramic-albedo", drawCeramic) },
    energy: { albedo: createTexture(scene, "kit-energy-albedo", drawEnergy) },
  };
}
