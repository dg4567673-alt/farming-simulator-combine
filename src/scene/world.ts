import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SceneMaterials } from './materials';
import { SceneTextureBundle } from './textures';
import { ZONES } from '../sim/worldLayout';

export interface LivestockActor {
  root: THREE.Group;
  legs: THREE.Object3D[];
  head: THREE.Object3D;
  homeX: number;
  homeZ: number;
  phase: number;
  walkRadius: number;
  speed: number;
}

export interface AmbientTrafficActor {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  x: number;
  z: number;
  dir: number; // +1 or -1 along X
  speed: number;
}

export interface VillageWorldHandle {
  root: THREE.Group;
  livestock: LivestockActor[];
  traffic: AmbientTrafficActor;
  update: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

function buildIndianHouse(
  w: number,
  h: number,
  d: number,
  useBrick: boolean,
  mats: SceneMaterials,
  geometries: THREE.BufferGeometry[],
): THREE.Group {
  const g = new THREE.Group();

  // Raised concrete/mud plinth (chabutra)
  const plinthGeo = new THREE.BoxGeometry(w + 1.6, 0.3, d + 2.2);
  geometries.push(plinthGeo);
  const plinth = new THREE.Mesh(plinthGeo, mats.limePlaster);
  plinth.position.set(0, 0.15, 0.5);
  plinth.receiveShadow = true;
  g.add(plinth);

  // Main Masonry Body
  const wallGeo = new THREE.BoxGeometry(w, h, d);
  geometries.push(wallGeo);
  const walls = new THREE.Mesh(wallGeo, useBrick ? mats.villageBrick : mats.limePlaster);
  walls.position.set(0, 0.3 + h * 0.5, 0);
  walls.castShadow = true;
  walls.receiveShadow = true;
  g.add(walls);

  // Terracotta Pitched or Flat Parapet Roof
  if (useBrick) {
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    geometries.push(roofGeo);
    const roof = new THREE.Mesh(roofGeo, mats.terracottaRoof);
    roof.position.set(0, 0.3 + h + 0.72, 0);
    roof.castShadow = true;
    g.add(roof);
  } else {
    const slabGeo = new THREE.BoxGeometry(w + 0.5, 0.22, d + 0.5);
    geometries.push(slabGeo);
    const slab = new THREE.Mesh(slabGeo, mats.limePlaster);
    slab.position.set(0, 0.3 + h + 0.11, 0);
    slab.castShadow = true;
    g.add(slab);

    // Parapet wall
    const paraGeo = new THREE.BoxGeometry(w + 0.4, 0.45, d + 0.4);
    geometries.push(paraGeo);
    const para = new THREE.Mesh(paraGeo, mats.villageBrick);
    para.position.set(0, 0.3 + h + 0.34, 0);
    g.add(para);
  }

  // Timber Front Door & Shuttered Windows
  const doorGeo = new THREE.BoxGeometry(1.15, 2.05, 0.12);
  geometries.push(doorGeo);
  const door = new THREE.Mesh(doorGeo, mats.timberWood);
  door.position.set(0, 1.32, d * 0.5 + 0.04);
  g.add(door);

  [-w * 0.28, w * 0.28].forEach((wx) => {
    const winGeo = new THREE.BoxGeometry(1.0, 0.95, 0.12);
    geometries.push(winGeo);
    const win = new THREE.Mesh(winGeo, mats.timberWood);
    win.position.set(wx, 2.05, d * 0.5 + 0.04);
    g.add(win);
  });

  // Veranda awning on front
  const verandaRoofGeo = new THREE.BoxGeometry(w + 0.8, 0.12, 1.9);
  geometries.push(verandaRoofGeo);
  const verandaRoof = new THREE.Mesh(verandaRoofGeo, mats.corrugatedTin);
  verandaRoof.rotation.x = 0.14;
  verandaRoof.position.set(0, 2.75, d * 0.5 + 0.85);
  verandaRoof.castShadow = true;
  g.add(verandaRoof);

  [-w * 0.44, w * 0.44].forEach((px) => {
    const colGeo = new THREE.CylinderGeometry(0.11, 0.12, 2.55, 10);
    geometries.push(colGeo);
    const col = new THREE.Mesh(colGeo, mats.limePlaster);
    col.position.set(px, 1.55, d * 0.5 + 1.55);
    col.castShadow = true;
    g.add(col);
  });

  return g;
}

function buildAnimalMesh(
  kind: 'cow' | 'buffalo' | 'goat',
  mats: SceneMaterials,
  extraMats: THREE.Material[],
  geometries: THREE.BufferGeometry[],
): { root: THREE.Group; legs: THREE.Object3D[]; head: THREE.Object3D } {
  const root = new THREE.Group();
  const legs: THREE.Object3D[] = [];

  const scale = kind === 'goat' ? 0.56 : kind === 'buffalo' ? 1.12 : 1.0;
  const bodyColor =
    kind === 'buffalo' ? 0x262528 : kind === 'cow' ? 0xd9cdb8 : 0x7e6b56;
  const coatMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.88,
    metalness: 0.0,
  });
  extraMats.push(coatMat);

  // Contact shadow
  const csGeo = new THREE.PlaneGeometry(1.4 * scale, 2.1 * scale);
  csGeo.rotateX(-Math.PI / 2);
  geometries.push(csGeo);
  const cs = new THREE.Mesh(csGeo, mats.contactShadowMat);
  cs.position.y = 0.015;
  root.add(cs);

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.68 * scale, 0.68 * scale, 1.48 * scale);
  geometries.push(torsoGeo);
  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.position.set(0, 1.02 * scale, 0);
  torso.castShadow = true;
  root.add(torso);

  // Zebu Cow Hump
  if (kind === 'cow') {
    const humpGeo = new THREE.SphereGeometry(0.24, 10, 8);
    geometries.push(humpGeo);
    const hump = new THREE.Mesh(humpGeo, coatMat);
    hump.position.set(0, 1.38, 0.42);
    root.add(hump);
  }

  // Neck + Head Group
  const head = new THREE.Group();
  head.position.set(0, 1.16 * scale, 0.72 * scale);
  root.add(head);

  const neckGeo = new THREE.CylinderGeometry(0.2 * scale, 0.26 * scale, 0.46 * scale, 10);
  geometries.push(neckGeo);
  const neck = new THREE.Mesh(neckGeo, coatMat);
  neck.rotation.x = 0.65;
  neck.position.set(0, 0.1, 0.16 * scale);
  head.add(neck);

  const skullGeo = new THREE.BoxGeometry(0.36 * scale, 0.34 * scale, 0.5 * scale);
  geometries.push(skullGeo);
  const skull = new THREE.Mesh(skullGeo, coatMat);
  skull.position.set(0, 0.24 * scale, 0.42 * scale);
  skull.castShadow = true;
  head.add(skull);

  // Curved Horns
  [-0.18 * scale, 0.18 * scale].forEach((hx) => {
    const hornGeo = new THREE.ConeGeometry(0.045 * scale, 0.34 * scale, 8);
    geometries.push(hornGeo);
    const horn = new THREE.Mesh(hornGeo, mats.castIronDark);
    horn.rotation.z = hx > 0 ? -0.6 : 0.6;
    horn.rotation.x = kind === 'buffalo' ? -0.6 : 0.2;
    horn.position.set(hx, 0.42 * scale, 0.3 * scale);
    head.add(horn);
  });

  // 4 Articulated Legs
  const legPositions: [number, number][] = [
    [-0.22 * scale, 0.52 * scale],
    [0.22 * scale, 0.52 * scale],
    [-0.22 * scale, -0.52 * scale],
    [0.22 * scale, -0.52 * scale],
  ];
  const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.065 * scale, 0.72 * scale, 8);
  legGeo.translate(0, -0.36 * scale, 0);
  geometries.push(legGeo);

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, 0.72 * scale, lz);
    leg.castShadow = true;
    root.add(leg);
    legs.push(leg);
  }

  return { root, legs, head };
}

export function buildVillageWorld(
  mats: SceneMaterials,
  tex: SceneTextureBundle,
): VillageWorldHandle {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const extraMats: THREE.Material[] = [];

  // 1. Continuous Extended Rural Terrain (520m x 520m so horizon fog blends smoothly)
  const groundGeo = new THREE.PlaneGeometry(520, 520);
  groundGeo.rotateX(-Math.PI / 2);
  geometries.push(groundGeo);
  const ground = new THREE.Mesh(groundGeo, mats.meadowGround);
  ground.position.y = 0;
  ground.receiveShadow = true;
  root.add(ground);

  // 2. Paved East-West Village Asphalt Highway (Z = -34)
  const roadGeo = new THREE.PlaneGeometry(240, 8.8);
  roadGeo.rotateX(-Math.PI / 2);
  geometries.push(roadGeo);
  const highway = new THREE.Mesh(roadGeo, mats.asphaltRoad);
  highway.position.set(0, 0.024, -34);
  highway.receiveShadow = true;
  root.add(highway);

  // White road center dashes (InstancedMesh)
  const dashGeo = new THREE.PlaneGeometry(3.2, 0.22);
  dashGeo.rotateX(-Math.PI / 2);
  geometries.push(dashGeo);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.9 });
  extraMats.push(dashMat);
  const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, 28);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 28; i++) {
    dummy.position.set(-108 + i * 8, 0.032, -34);
    dummy.updateMatrix();
    dashInst.setMatrixAt(i, dummy.matrix);
  }
  dashInst.instanceMatrix.needsUpdate = true;
  root.add(dashInst);

  // 3. Dusty Kachcha Village Dirt Tracks (world-proportioned UVs so grit never stretches)
  const makeDirtMat = (rx: number, ry: number) => {
    const t = tex.dirtTrackAlbedo.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: t,
      roughness: 0.96,
      metalness: 0.0,
    });
    extraMats.push(m);
    return m;
  };

  const nsTrackGeo = new THREE.PlaneGeometry(7.2, 108);
  nsTrackGeo.rotateX(-Math.PI / 2);
  geometries.push(nsTrackGeo);
  const nsTrack = new THREE.Mesh(nsTrackGeo, makeDirtMat(1.2, 18));
  nsTrack.position.set(0, 0.02, 20);
  nsTrack.receiveShadow = true;
  root.add(nsTrack);

  const ewTrackGeo = new THREE.PlaneGeometry(165, 6.4);
  ewTrackGeo.rotateX(-Math.PI / 2);
  geometries.push(ewTrackGeo);
  const ewTrack = new THREE.Mesh(ewTrackGeo, makeDirtMat(26, 1.1));
  ewTrack.position.set(16, 0.022, 14);
  ewTrack.receiveShadow = true;
  root.add(ewTrack);

  const yardPadGeo = new THREE.PlaneGeometry(54, 24);
  yardPadGeo.rotateX(-Math.PI / 2);
  geometries.push(yardPadGeo);
  const yardPad = new THREE.Mesh(yardPadGeo, makeDirtMat(9, 4));
  yardPad.position.set(-6, 0.018, -10);
  yardPad.receiveShadow = true;
  root.add(yardPad);

  // 4. Shubham's Farmhouse & Village Houses
  const farmhouse = buildIndianHouse(11.5, 3.6, 7.6, true, mats, geometries);
  farmhouse.position.set(-16, 0, -22);
  root.add(farmhouse);

  // Traditional woven Charpai (cot) outside Farmhouse
  const cotFrameGeo = new THREE.BoxGeometry(2.1, 0.12, 1.1);
  geometries.push(cotFrameGeo);
  const cot = new THREE.Mesh(cotFrameGeo, mats.timberWood);
  cot.position.set(-13.5, 0.45, -16.8);
  cot.castShadow = true;
  root.add(cot);

  const villageHouses: Array<{ x: number; z: number; brick: boolean; rot: number }> = [
    { x: -18.5, z: -52.5, brick: true, rot: 0 },
    { x: -0.5, z: -52.5, brick: false, rot: 0 },
    { x: 17.5, z: -52.5, brick: true, rot: 0 },
    { x: -58, z: -51, brick: false, rot: 0 },
  ];
  for (const h of villageHouses) {
    const house = buildIndianHouse(10.5, 3.4, 7.4, h.brick, mats, geometries);
    house.position.set(h.x, 0, h.z);
    house.rotation.y = h.rot;
    root.add(house);
  }

  // Tall Rural Overhead Water Tank (Landmark visible from spawn!)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(8, 0, -68);
  const legGeo = new THREE.CylinderGeometry(0.32, 0.42, 12, 10);
  geometries.push(legGeo);
  [
    [-1.8, -1.8],
    [1.8, -1.8],
    [-1.8, 1.8],
    [1.8, 1.8],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, mats.limePlaster);
    leg.position.set(lx, 6, lz);
    leg.castShadow = true;
    towerGroup.add(leg);
  });
  const tankGeo = new THREE.CylinderGeometry(3.2, 2.8, 3.8, 18);
  geometries.push(tankGeo);
  const tank = new THREE.Mesh(tankGeo, mats.limePlaster);
  tank.position.set(0, 13.6, 0);
  tank.castShadow = true;
  towerGroup.add(tank);
  const tankCapGeo = new THREE.ConeGeometry(3.4, 1.4, 18);
  geometries.push(tankCapGeo);
  const tankCap = new THREE.Mesh(tankCapGeo, mats.truckBluePaint);
  tankCap.position.set(0, 16.2, 0);
  towerGroup.add(tankCap);
  root.add(towerGroup);

  // 5. Kisan Diesel & Petrol Pump (X=-36, Z=-46; drive-in bay Z=-41)
  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(ZONES.petrolPump.x, 0, -45.5);

  const forecourtGeo = new THREE.BoxGeometry(16, 0.08, 10);
  geometries.push(forecourtGeo);
  const forecourt = new THREE.Mesh(forecourtGeo, mats.limePlaster);
  forecourt.position.set(0, 0.04, 2.2);
  forecourt.receiveShadow = true;
  pumpGroup.add(forecourt);

  const canopyGeo = new THREE.BoxGeometry(13.5, 0.55, 7.2);
  geometries.push(canopyGeo);
  const canopy = new THREE.Mesh(canopyGeo, mats.tractorRedPaint);
  canopy.position.set(0, 4.6, 0);
  canopy.castShadow = true;
  pumpGroup.add(canopy);

  const signBoardGeo = new THREE.PlaneGeometry(9.5, 1.4);
  geometries.push(signBoardGeo);
  const pumpSignMat = new THREE.MeshStandardMaterial({
    map: tex.pumpSign,
    roughness: 0.4,
    metalness: 0.1,
  });
  extraMats.push(pumpSignMat);
  const pumpSignMesh = new THREE.Mesh(signBoardGeo, pumpSignMat);
  pumpSignMesh.position.set(0, 4.6, 3.65);
  pumpGroup.add(pumpSignMesh);

  [-4.8, 4.8].forEach((px) => {
    const colGeo = new THREE.BoxGeometry(0.45, 4.5, 0.45);
    geometries.push(colGeo);
    const col = new THREE.Mesh(colGeo, mats.chromeSteel);
    col.position.set(px, 2.25, 0);
    col.castShadow = true;
    pumpGroup.add(col);
  });

  // Two Diesel Dispensers
  [-2.5, 2.5].forEach((dx) => {
    const dispGeo = new THREE.BoxGeometry(0.95, 1.85, 0.7);
    geometries.push(dispGeo);
    const disp = new THREE.Mesh(dispGeo, mats.jcbYellowPaint);
    disp.position.set(dx, 0.96, 0);
    disp.castShadow = true;
    pumpGroup.add(disp);
  });

  // Pump Office Building
  const officeGeo = new THREE.BoxGeometry(6.5, 3.2, 6.2);
  geometries.push(officeGeo);
  const office = new THREE.Mesh(officeGeo, mats.villageBrick);
  office.position.set(-6.5, 1.6, -5.5);
  office.castShadow = true;
  pumpGroup.add(office);
  root.add(pumpGroup);

  // 6. Shubham Anaj Mandi (Village Market, X=+42, Z=-52; unloading bay Z=-41)
  const mandiGroup = new THREE.Group();
  mandiGroup.position.set(ZONES.mandi.x, 0, -52);

  const mandiPadGeo = new THREE.BoxGeometry(20, 0.1, 16);
  geometries.push(mandiPadGeo);
  const mandiPad = new THREE.Mesh(mandiPadGeo, mats.limePlaster);
  mandiPad.position.set(0, 0.05, 5);
  mandiPad.receiveShadow = true;
  mandiGroup.add(mandiPad);

  const shedRoofGeo = new THREE.BoxGeometry(17.5, 0.25, 10.5);
  geometries.push(shedRoofGeo);
  const shedRoof = new THREE.Mesh(shedRoofGeo, mats.corrugatedTin);
  shedRoof.position.set(0, 4.9, 0);
  shedRoof.castShadow = true;
  mandiGroup.add(shedRoof);

  const mandiSignGeo = new THREE.PlaneGeometry(10.5, 1.8);
  geometries.push(mandiSignGeo);
  const mandiSignMat = new THREE.MeshStandardMaterial({
    map: tex.mandiSign,
    roughness: 0.45,
  });
  extraMats.push(mandiSignMat);
  const mandiSignMesh = new THREE.Mesh(mandiSignGeo, mandiSignMat);
  mandiSignMesh.position.set(0, 4.95, 5.32);
  mandiGroup.add(mandiSignMesh);

  [-7.5, 0, 7.5].forEach((px) => {
    [-4.5, 4.5].forEach((pz) => {
      const pGeo = new THREE.CylinderGeometry(0.18, 0.2, 4.8, 10);
      geometries.push(pGeo);
      const pillar = new THREE.Mesh(pGeo, mats.castIronDark);
      pillar.position.set(px, 2.4, pz);
      pillar.castShadow = true;
      mandiGroup.add(pillar);
    });
  });

  // Stacked Burlap Grain Sacks (Bori)
  const sackGeo = new THREE.BoxGeometry(1.1, 0.52, 0.72);
  geometries.push(sackGeo);
  const sackMat = new THREE.MeshStandardMaterial({
    color: 0xb29568,
    roughness: 0.94,
  });
  extraMats.push(sackMat);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const sack = new THREE.Mesh(sackGeo, sackMat);
      sack.position.set(-4.5 + col * 1.2, 0.35 + row * 0.52, -1.5);
      sack.rotation.y = (col % 2) * 0.1;
      sack.castShadow = true;
      mandiGroup.add(sack);
    }
  }
  root.add(mandiGroup);

  // 7. Gaushala / Dairy Shed (X=36, Z=-18)
  const dairyGroup = new THREE.Group();
  dairyGroup.position.set(ZONES.dairyShed.x, 0, ZONES.dairyShed.z);
  const dRoofGeo = new THREE.BoxGeometry(13.5, 0.18, 8.5);
  geometries.push(dRoofGeo);
  const dRoof = new THREE.Mesh(dRoofGeo, mats.corrugatedTin);
  dRoof.rotation.x = 0.1;
  dRoof.position.set(0, 3.2, 0);
  dRoof.castShadow = true;
  dairyGroup.add(dRoof);

  [-6, 0, 6].forEach((px) => {
    [-3.6, 3.6].forEach((pz) => {
      const pGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.2, 8);
      geometries.push(pGeo);
      const post = new THREE.Mesh(pGeo, mats.timberWood);
      post.position.set(px, 1.6, pz);
      dairyGroup.add(post);
    });
  });
  root.add(dairyGroup);

  // 8. Realistic Articulated Cows, Buffaloes & Goats
  const livestock: LivestockActor[] = [];
  const animalConfigs: Array<{
    kind: 'cow' | 'buffalo' | 'goat';
    x: number;
    z: number;
    radius: number;
  }> = [
    { kind: 'cow', x: 32, z: -10, radius: 4.5 },
    { kind: 'cow', x: 42, z: -8, radius: 5.0 },
    { kind: 'buffalo', x: 35, z: -14, radius: 3.8 },
    { kind: 'buffalo', x: 44, z: -15, radius: 4.2 },
    { kind: 'goat', x: -10, z: -20, radius: 3.2 },
    { kind: 'goat', x: -12, z: -17, radius: 2.8 },
  ];

  animalConfigs.forEach((cfg, idx) => {
    const a = buildAnimalMesh(cfg.kind, mats, extraMats, geometries);
    a.root.position.set(cfg.x, 0, cfg.z);
    root.add(a.root);
    livestock.push({
      root: a.root,
      legs: a.legs,
      head: a.head,
      homeX: cfg.x,
      homeZ: cfg.z,
      phase: idx * 1.4,
      walkRadius: cfg.radius,
      speed: 0.32 + (idx % 3) * 0.08,
    });
  });

  // 9. Instanced Multi-Cluster Organic Neem & Mango Trees + Distant Horizon Grove
  const treeCoords: Array<[number, number, number]> = [
    [-28, -28, 1.15],
    [-46, -24, 1.0],
    [-58, -14, 1.25],
    [-64, 10, 1.1],
    [-64, 42, 1.2],
    [-62, 74, 1.05],
    [-32, 78, 1.15],
    [0, 82, 1.3],
    [34, 78, 1.1],
    [68, 78, 1.2],
    [98, 48, 1.15],
    [98, 10, 1.1],
    [60, -18, 1.2],
    [64, -46, 1.05],
    [-32, -64, 1.15],
    [28, -66, 1.25],
    [-72, -40, 1.1],
    [72, -38, 1.05],
    [-34, -26, 0.95],
    [54, -8, 1.1],
    [-82, 24, 1.2],
    [104, -18, 1.15],
    [-78, -66, 1.25],
    [82, -68, 1.1],
    // Distant horizon grove belt so skyline looks richly rural
    [-92, 88, 1.4],
    [-62, 96, 1.55],
    [-28, 98, 1.35],
    [12, 102, 1.5],
    [48, 96, 1.4],
    [84, 92, 1.45],
    [112, 68, 1.35],
    [116, 26, 1.4],
    [-105, 58, 1.4],
    [-108, -8, 1.35],
    [-98, -84, 1.45],
    [-45, -88, 1.4],
    [44, -86, 1.45],
    [96, -84, 1.35],
  ];

  // Composite branching trunk (main trunk + 2 fork limbs)
  const mainTrunk = new THREE.CylinderGeometry(0.28, 0.5, 3.6, 8);
  mainTrunk.translate(0, 1.8, 0);
  const limbA = new THREE.CylinderGeometry(0.14, 0.24, 2.2, 7);
  limbA.rotateZ(0.55);
  limbA.translate(-0.7, 3.4, 0.15);
  const limbB = new THREE.CylinderGeometry(0.14, 0.24, 2.1, 7);
  limbB.rotateZ(-0.5);
  limbB.rotateY(0.4);
  limbB.translate(0.68, 3.35, -0.2);
  const trunkGeo = BufferGeometryUtils.mergeGeometries([mainTrunk, limbA, limbB], false);
  [mainTrunk, limbA, limbB].forEach((g) => g.dispose());
  geometries.push(trunkGeo);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.barkAlbedo,
    roughness: 0.94,
  });
  extraMats.push(trunkMat);

  // Composite 6-lobe organic crown (wide spreading Neem/Mango silhouette)
  const crownParts: THREE.BufferGeometry[] = [];
  const lobeSpecs: Array<[number, number, number, number]> = [
    [0, 5.2, 0, 2.1],
    [-1.45, 4.6, 0.55, 1.55],
    [1.45, 4.65, -0.45, 1.6],
    [0.25, 4.85, 1.35, 1.5],
    [-0.35, 4.75, -1.35, 1.45],
    [0.15, 6.2, 0.1, 1.35],
  ];
  for (const [lx, ly, lz, rad] of lobeSpecs) {
    const lobe = new THREE.IcosahedronGeometry(rad, 1);
    lobe.scale(1.12, 0.78, 1.05);
    lobe.translate(lx, ly, lz);
    crownParts.push(lobe);
  }
  const treeCanopyGeo = BufferGeometryUtils.mergeGeometries(crownParts, false);
  crownParts.forEach((g) => g.dispose());
  geometries.push(treeCanopyGeo);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });
  extraMats.push(foliageMat);

  const trunksInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  trunksInst.castShadow = true;
  trunksInst.receiveShadow = true;
  const canopiesInst = new THREE.InstancedMesh(treeCanopyGeo, foliageMat, treeCoords.length);
  canopiesInst.castShadow = true;
  canopiesInst.receiveShadow = true;

  const col = new THREE.Color();
  treeCoords.forEach(([tx, tz, sc], idx) => {
    dummy.position.set(tx, 0, tz);
    dummy.rotation.set(0, idx * 1.7, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunksInst.setMatrixAt(idx, dummy.matrix);
    canopiesInst.setMatrixAt(idx, dummy.matrix);

    const shade = 0.8 + (idx % 5) * 0.07;
    col.setRGB(0.19 * shade, 0.34 * shade, 0.13 * shade);
    canopiesInst.setColorAt(idx, col);
  });
  trunksInst.instanceMatrix.needsUpdate = true;
  canopiesInst.instanceMatrix.needsUpdate = true;
  if (canopiesInst.instanceColor) canopiesInst.instanceColor.needsUpdate = true;
  root.add(trunksInst);
  root.add(canopiesInst);

  // Roadside Concrete Utility Poles along East-West Highway
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.2, 8);
  poleGeo.translate(0, 3.1, 0);
  geometries.push(poleGeo);
  const poleInst = new THREE.InstancedMesh(poleGeo, mats.limePlaster, 8);
  poleInst.castShadow = true;
  for (let i = 0; i < 8; i++) {
    dummy.position.set(-84 + i * 24, 0, -28.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(i, dummy.matrix);
  }
  poleInst.instanceMatrix.needsUpdate = true;
  root.add(poleInst);

  // 10. Autonomous Ambient Rural Pickup Truck cruising on Highway (Z=-32.0)
  const trafficRoot = new THREE.Group();
  const trafficWheels: THREE.Object3D[] = [];
  const tBodyGeo = new THREE.BoxGeometry(3.8, 1.1, 1.85);
  geometries.push(tBodyGeo);
  const tBody = new THREE.Mesh(tBodyGeo, mats.implementOrangePaint);
  tBody.position.set(0, 0.9, 0);
  tBody.castShadow = true;
  trafficRoot.add(tBody);

  const tCabGeo = new THREE.BoxGeometry(1.4, 1.0, 1.75);
  geometries.push(tCabGeo);
  const tCab = new THREE.Mesh(tCabGeo, mats.limePlaster);
  tCab.position.set(1.1, 1.7, 0);
  trafficRoot.add(tCab);

  const twGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14);
  twGeo.rotateX(Math.PI / 2);
  geometries.push(twGeo);
  [
    [-1.25, 0.92],
    [-1.25, -0.92],
    [1.25, 0.92],
    [1.25, -0.92],
  ].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(twGeo, mats.rubberTire);
    w.position.set(wx, 0.42, wz);
    trafficRoot.add(w);
    trafficWheels.push(w);
  });
  trafficRoot.position.set(-75, 0, -32.2);
  root.add(trafficRoot);

  const traffic: AmbientTrafficActor = {
    root: trafficRoot,
    wheels: trafficWheels,
    x: -75,
    z: -32.2,
    dir: 1,
    speed: 9.5,
  };

  return {
    root,
    livestock,
    traffic,
    update: (elapsed: number, dt: number) => {
      // Animate grazing & walking livestock
      for (const a of livestock) {
        const ang = elapsed * a.speed + a.phase;
        const nextX = a.homeX + Math.cos(ang) * a.walkRadius;
        const nextZ = a.homeZ + Math.sin(ang) * a.walkRadius * 0.7;
        const dx = nextX - a.root.position.x;
        const dz = nextZ - a.root.position.z;
        a.root.position.set(nextX, 0, nextZ);
        if (Math.hypot(dx, dz) > 0.001) {
          a.root.rotation.y = Math.atan2(dx, dz);
        }
        const stride = Math.sin(elapsed * 4.2 + a.phase) * 0.35;
        a.legs[0].rotation.x = stride;
        a.legs[1].rotation.x = -stride;
        a.legs[2].rotation.x = -stride;
        a.legs[3].rotation.x = stride;
        a.head.rotation.x = Math.sin(elapsed * 1.4 + a.phase) * 0.16;
      }

      // Cruise ambient pickup along East-West Highway
      traffic.x += traffic.dir * traffic.speed * dt;
      if (traffic.x > 102) {
        traffic.dir = -1;
        traffic.z = -35.8;
        traffic.root.rotation.y = Math.PI;
      } else if (traffic.x < -102) {
        traffic.dir = 1;
        traffic.z = -32.2;
        traffic.root.rotation.y = 0;
      }
      traffic.root.position.set(traffic.x, 0, traffic.z);
      for (const w of traffic.wheels) {
        w.rotation.z -= (traffic.speed * dt) / 0.42;
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      extraMats.forEach((m) => m.dispose());
    },
  };
}
