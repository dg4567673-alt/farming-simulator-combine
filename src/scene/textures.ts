import * as THREE from 'three';

export interface SceneTextureBundle {
  soilAlbedo: THREE.Texture;
  soilBump: THREE.CanvasTexture;
  brickAlbedo: THREE.Texture;
  asphaltAlbedo: THREE.Texture;
  grassAlbedo: THREE.CanvasTexture;
  dirtTrackAlbedo: THREE.CanvasTexture;
  plasterAlbedo: THREE.CanvasTexture;
  corrugatedBump: THREE.CanvasTexture;
  tireLugBump: THREE.CanvasTexture;
  woodAlbedo: THREE.CanvasTexture;
  barkAlbedo: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  mandiSign: THREE.CanvasTexture;
  pumpSign: THREE.CanvasTexture;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  tex: THREE.Texture,
  maxAniso: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1,
  isCanvas = true,
): void {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (isCanvas) {
    tex.needsUpdate = true;
  }
}

export function createSceneTextures(renderer: THREE.WebGLRenderer): SceneTextureBundle {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
  const loader = new THREE.TextureLoader();

  // 1. Load generated photorealistic seamless textures (do NOT set needsUpdate before image loads)
  const soilAlbedo = loader.load('/src/assets/images/tex_soil_tilled_1795427812175.jpg');
  configureTexture(soilAlbedo, maxAniso, true, 1, 1, false);

  const brickAlbedo = loader.load('/src/assets/images/tex_village_brick_1795427813438.jpg');
  configureTexture(brickAlbedo, maxAniso, true, 2, 1.4, false);

  const asphaltAlbedo = loader.load('/src/assets/images/tex_asphalt_road_1795427813011.jpg');
  configureTexture(asphaltAlbedo, maxAniso, true, 24, 1.4, false);

  // 2. Procedural Soil Bump Map (fine granular clods)
  const [soilBumpC, sbCtx] = makeCanvas(512, 512);
  const randSoil = seededRand(101);
  sbCtx.fillStyle = '#808080';
  sbCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9500; i++) {
    const v = Math.floor(70 + randSoil() * 125);
    sbCtx.fillStyle = `rgb(${v},${v},${v})`;
    sbCtx.beginPath();
    sbCtx.arc(randSoil() * 512, randSoil() * 512, 0.8 + randSoil() * 2.2, 0, Math.PI * 2);
    sbCtx.fill();
  }
  const soilBump = new THREE.CanvasTexture(soilBumpC);
  configureTexture(soilBump, maxAniso, false, 1, 1);

  // 3. Natural Organic Rural Indian Meadow & Dry Grass (smooth blended gradients + fine grass strokes)
  const [grassC, gCtx] = makeCanvas(512, 512);
  const randGrass = seededRand(202);
  gCtx.fillStyle = '#5a633e';
  gCtx.fillRect(0, 0, 512, 512);

  // Soft natural dry/damp earth patches
  for (let i = 0; i < 160; i++) {
    const gx = randGrass() * 512;
    const gy = randGrass() * 512;
    const rad = 24 + randGrass() * 58;
    const grd = gCtx.createRadialGradient(gx, gy, 2, gx, gy, rad);
    const warm = randGrass() > 0.45;
    grd.addColorStop(0, warm ? 'rgba(118, 106, 72, 0.28)' : 'rgba(72, 86, 48, 0.28)');
    grd.addColorStop(1, 'rgba(90, 99, 62, 0)');
    gCtx.fillStyle = grd;
    gCtx.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
  }
  // Fine organic grass blades & dry straw flecks
  for (let i = 0; i < 14000; i++) {
    const x = randGrass() * 512;
    const y = randGrass() * 512;
    const t = randGrass();
    gCtx.strokeStyle =
      t < 0.35
        ? 'rgba(74, 88, 46, 0.55)'
        : t < 0.72
          ? 'rgba(104, 114, 66, 0.5)'
          : 'rgba(138, 124, 82, 0.45)';
    gCtx.lineWidth = 1;
    gCtx.beginPath();
    gCtx.moveTo(x, y);
    gCtx.lineTo(x + (randGrass() - 0.5) * 4, y - 2 - randGrass() * 5);
    gCtx.stroke();
  }
  const grassAlbedo = new THREE.CanvasTexture(grassC);
  configureTexture(grassAlbedo, maxAniso, true, 48, 48);

  // 4. Compacted Kachcha Village Dirt Track Albedo (fine earthy grit & subtle tire ruts)
  const [dirtC, dCtx] = makeCanvas(512, 512);
  const randDirt = seededRand(303);
  dCtx.fillStyle = '#8b7355';
  dCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) {
    const dx = randDirt() * 512;
    const dy = randDirt() * 512;
    const dr = 18 + randDirt() * 44;
    const grd = dCtx.createRadialGradient(dx, dy, 2, dx, dy, dr);
    grd.addColorStop(0, randDirt() > 0.5 ? 'rgba(112, 90, 64, 0.26)' : 'rgba(154, 132, 102, 0.24)');
    grd.addColorStop(1, 'rgba(139, 115, 85, 0)');
    dCtx.fillStyle = grd;
    dCtx.fillRect(dx - dr, dy - dr, dr * 2, dr * 2);
  }
  for (let i = 0; i < 10000; i++) {
    const t = randDirt();
    dCtx.fillStyle =
      t < 0.4 ? 'rgba(98, 78, 54, 0.45)' : t < 0.8 ? 'rgba(164, 142, 112, 0.4)' : 'rgba(78, 62, 42, 0.45)';
    dCtx.fillRect(randDirt() * 512, randDirt() * 512, 1.5, 1.5);
  }
  const dirtTrackAlbedo = new THREE.CanvasTexture(dirtC);
  configureTexture(dirtTrackAlbedo, maxAniso, true, 1, 1);

  // 5. Lime-Washed Rural Plaster Wall
  const [plasterC, pCtx] = makeCanvas(256, 256);
  const randPlaster = seededRand(404);
  pCtx.fillStyle = '#ddd2bf';
  pCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const shade = Math.floor(202 + randPlaster() * 28);
    pCtx.fillStyle = `rgb(${shade},${shade - 8},${shade - 20})`;
    pCtx.fillRect(randPlaster() * 256, randPlaster() * 256, 2 + randPlaster() * 4, 2 + randPlaster() * 4);
  }
  const grad = pCtx.createLinearGradient(0, 190, 0, 256);
  grad.addColorStop(0, 'rgba(110, 88, 65, 0)');
  grad.addColorStop(1, 'rgba(96, 76, 54, 0.36)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 190, 256, 66);
  const plasterAlbedo = new THREE.CanvasTexture(plasterC);
  configureTexture(plasterAlbedo, maxAniso, true, 1, 1);

  // 6. Corrugated Galvanized Metal Bump Map
  const [corrC, cCtx] = makeCanvas(256, 256);
  for (let x = 0; x < 256; x++) {
    const wave = Math.sin((x / 256) * Math.PI * 24) * 0.5 + 0.5;
    const v = Math.floor(75 + wave * 150);
    cCtx.fillStyle = `rgb(${v},${v},${v})`;
    cCtx.fillRect(x, 0, 1, 256);
  }
  const corrugatedBump = new THREE.CanvasTexture(corrC);
  configureTexture(corrugatedBump, maxAniso, false, 4, 2);

  // 7. Heavy Agricultural Chevron Tire Lug Bump Map
  const [tireC, tCtx] = makeCanvas(256, 256);
  tCtx.fillStyle = '#383838';
  tCtx.fillRect(0, 0, 256, 256);
  tCtx.strokeStyle = '#e8e8e8';
  tCtx.lineWidth = 14;
  tCtx.lineCap = 'round';
  for (let y = -32; y < 288; y += 32) {
    tCtx.beginPath();
    tCtx.moveTo(10, y);
    tCtx.lineTo(118, y + 20);
    tCtx.stroke();
    tCtx.beginPath();
    tCtx.moveTo(246, y + 16);
    tCtx.lineTo(138, y + 36);
    tCtx.stroke();
  }
  const tireLugBump = new THREE.CanvasTexture(tireC);
  configureTexture(tireLugBump, maxAniso, false, 1, 4);

  // 8. Timber Wood Grain
  const [woodC, wCtx] = makeCanvas(256, 256);
  const randWood = seededRand(505);
  wCtx.fillStyle = '#6b472b';
  wCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    const v = Math.floor(75 + randWood() * 35);
    wCtx.fillStyle = `rgb(${v + 20}, ${v - 4}, ${Math.max(15, v - 26)})`;
    wCtx.fillRect(0, y, 256, 2 + randWood() * 2);
  }
  const woodAlbedo = new THREE.CanvasTexture(woodC);
  configureTexture(woodAlbedo, maxAniso, true, 1, 1);

  // 9. Realistic Tree Bark Albedo
  const [barkC, bCtx] = makeCanvas(256, 256);
  const randBark = seededRand(606);
  bCtx.fillStyle = '#4f3b2a';
  bCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 4) {
    const v = Math.floor(58 + randBark() * 38);
    bCtx.fillStyle = `rgb(${v + 18}, ${v + 4}, ${Math.max(16, v - 10)})`;
    bCtx.fillRect(x, 0, 2 + randBark() * 3, 256);
  }
  for (let i = 0; i < 600; i++) {
    bCtx.fillStyle = 'rgba(34, 24, 16, 0.35)';
    bCtx.fillRect(randBark() * 256, randBark() * 256, 2, 12 + randBark() * 24);
  }
  const barkAlbedo = new THREE.CanvasTexture(barkC);
  configureTexture(barkAlbedo, maxAniso, true, 2, 3);

  // 10. Soft Radial Contact Shadow Disc
  const [csC, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  csGrad.addColorStop(0, 'rgba(10, 9, 8, 0.72)');
  csGrad.addColorStop(0.55, 'rgba(10, 9, 8, 0.36)');
  csGrad.addColorStop(1, 'rgba(10, 9, 8, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(csC);
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  // 11. Village Mandi Signage
  const [mC, mCtx] = makeCanvas(512, 128);
  mCtx.fillStyle = '#1f4d2e';
  mCtx.fillRect(0, 0, 512, 128);
  mCtx.strokeStyle = '#e5a93c';
  mCtx.lineWidth = 6;
  mCtx.strokeRect(8, 8, 496, 112);
  mCtx.fillStyle = '#f8f2e4';
  mCtx.font = 'bold 34px sans-serif';
  mCtx.textAlign = 'center';
  mCtx.fillText('SHUBHAM ANAJ MANDI', 256, 56);
  mCtx.fillStyle = '#f2c15a';
  mCtx.font = 'bold 22px sans-serif';
  mCtx.fillText('अनाज मंडी · GRAIN MARKET & SEEDS', 256, 94);
  const mandiSign = new THREE.CanvasTexture(mC);
  mandiSign.colorSpace = THREE.SRGBColorSpace;
  mandiSign.anisotropy = maxAniso;

  // 12. Petrol Pump Signage
  const [pC, pmCtx] = makeCanvas(512, 128);
  pmCtx.fillStyle = '#991b1b';
  pmCtx.fillRect(0, 0, 512, 128);
  pmCtx.fillStyle = '#facc15';
  pmCtx.fillRect(0, 96, 512, 32);
  pmCtx.fillStyle = '#ffffff';
  pmCtx.font = 'bold 34px sans-serif';
  pmCtx.textAlign = 'center';
  pmCtx.fillText('KISAN DIESEL PUMP', 256, 54);
  pmCtx.fillStyle = '#111827';
  pmCtx.font = 'bold 20px sans-serif';
  pmCtx.fillText('DIESEL ₹89/L · PETROL · 24 HRS', 256, 119);
  const pumpSign = new THREE.CanvasTexture(pC);
  pumpSign.colorSpace = THREE.SRGBColorSpace;
  pumpSign.anisotropy = maxAniso;

  return {
    soilAlbedo,
    soilBump,
    brickAlbedo,
    asphaltAlbedo,
    grassAlbedo,
    dirtTrackAlbedo,
    plasterAlbedo,
    corrugatedBump,
    tireLugBump,
    woodAlbedo,
    barkAlbedo,
    contactShadow,
    mandiSign,
    pumpSign,
    dispose: () => {
      [
        soilAlbedo,
        soilBump,
        brickAlbedo,
        asphaltAlbedo,
        grassAlbedo,
        dirtTrackAlbedo,
        plasterAlbedo,
        corrugatedBump,
        tireLugBump,
        woodAlbedo,
        barkAlbedo,
        contactShadow,
        mandiSign,
        pumpSign,
      ].forEach((t) => t.dispose());
    },
  };
}
