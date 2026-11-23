import * as THREE from 'three';
import { SceneTextureBundle } from './textures';

export interface SceneMaterials {
  tractorRedPaint: THREE.MeshPhysicalMaterial;
  harvesterGreenPaint: THREE.MeshPhysicalMaterial;
  jcbYellowPaint: THREE.MeshPhysicalMaterial;
  truckBluePaint: THREE.MeshPhysicalMaterial;
  implementOrangePaint: THREE.MeshStandardMaterial;
  castIronDark: THREE.MeshStandardMaterial;
  chromeSteel: THREE.MeshStandardMaterial;
  hydraulicPiston: THREE.MeshStandardMaterial;
  rubberTire: THREE.MeshStandardMaterial;
  cabGlass: THREE.MeshPhysicalMaterial;
  headlightEmissive: THREE.MeshStandardMaterial;
  taillightEmissive: THREE.MeshStandardMaterial;
  beaconAmber: THREE.MeshStandardMaterial;
  timberWood: THREE.MeshStandardMaterial;
  villageBrick: THREE.MeshStandardMaterial;
  limePlaster: THREE.MeshStandardMaterial;
  corrugatedTin: THREE.MeshStandardMaterial;
  terracottaRoof: THREE.MeshStandardMaterial;
  asphaltRoad: THREE.MeshStandardMaterial;
  dirtTrack: THREE.MeshStandardMaterial;
  meadowGround: THREE.MeshStandardMaterial;
  goldenGrain: THREE.MeshStandardMaterial;
  skinTone: THREE.MeshStandardMaterial;
  kurtaWhite: THREE.MeshStandardMaterial;
  turbanSaffron: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createSceneMaterials(
  tex: SceneTextureBundle,
  isSoftwareGl: boolean,
): SceneMaterials {
  const tractorRedPaint = new THREE.MeshPhysicalMaterial({
    color: 0xb91c1c,
    metalness: 0.35,
    roughness: 0.32,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
  });

  const harvesterGreenPaint = new THREE.MeshPhysicalMaterial({
    color: 0x1e6b34,
    metalness: 0.32,
    roughness: 0.35,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });

  const jcbYellowPaint = new THREE.MeshPhysicalMaterial({
    color: 0xd99b16,
    metalness: 0.3,
    roughness: 0.36,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  });

  const truckBluePaint = new THREE.MeshPhysicalMaterial({
    color: 0x1e4d7b,
    metalness: 0.3,
    roughness: 0.38,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
  });

  const implementOrangePaint = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    metalness: 0.35,
    roughness: 0.48,
  });

  const castIronDark = new THREE.MeshStandardMaterial({
    color: 0x262628,
    metalness: 0.65,
    roughness: 0.58,
  });

  const chromeSteel = new THREE.MeshStandardMaterial({
    color: 0xd4d8de,
    metalness: 0.92,
    roughness: 0.16,
  });

  const hydraulicPiston = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.12,
  });

  const rubberTire = new THREE.MeshStandardMaterial({
    color: 0x202124,
    metalness: 0.04,
    roughness: 0.9,
    bumpMap: tex.tireLugBump,
    bumpScale: 0.06,
  });

  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0xcbe3ef,
    metalness: 0.05,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.78,
    transparent: true,
    opacity: isSoftwareGl ? 0.38 : 0.92,
    ior: 1.5,
    depthWrite: false,
  });

  const headlightEmissive = new THREE.MeshStandardMaterial({
    color: 0xfff8e1,
    emissive: 0xffeb99,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.1,
  });

  const taillightEmissive = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    emissive: 0xef4444,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });

  const beaconAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  const timberWood = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.woodAlbedo,
    roughness: 0.85,
    metalness: 0.02,
  });

  const villageBrick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.brickAlbedo,
    roughness: 0.92,
    metalness: 0.0,
  });

  const limePlaster = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.plasterAlbedo,
    roughness: 0.9,
    metalness: 0.0,
  });

  const corrugatedTin = new THREE.MeshStandardMaterial({
    color: 0x9aa3ab,
    metalness: 0.72,
    roughness: 0.44,
    bumpMap: tex.corrugatedBump,
    bumpScale: 0.05,
  });

  const terracottaRoof = new THREE.MeshStandardMaterial({
    color: 0x9b462c,
    roughness: 0.88,
    metalness: 0.02,
    bumpMap: tex.corrugatedBump,
    bumpScale: 0.04,
  });

  const asphaltRoad = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.asphaltAlbedo,
    roughness: 0.92,
    metalness: 0.02,
  });

  const dirtTrack = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.dirtTrackAlbedo,
    roughness: 0.95,
    metalness: 0.0,
  });

  const meadowGround = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.grassAlbedo,
    roughness: 0.96,
    metalness: 0.0,
  });

  const goldenGrain = new THREE.MeshStandardMaterial({
    color: 0xd6a438,
    roughness: 0.88,
    metalness: 0.0,
    bumpMap: tex.soilBump,
    bumpScale: 0.04,
  });

  const skinTone = new THREE.MeshStandardMaterial({
    color: 0xa66e4a,
    roughness: 0.72,
    metalness: 0.0,
  });

  const kurtaWhite = new THREE.MeshStandardMaterial({
    color: 0xe8e2d5,
    roughness: 0.86,
    metalness: 0.0,
  });

  const turbanSaffron = new THREE.MeshStandardMaterial({
    color: 0xc95b1e,
    roughness: 0.82,
    metalness: 0.0,
  });

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: tex.contactShadow,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const all = [
    tractorRedPaint,
    harvesterGreenPaint,
    jcbYellowPaint,
    truckBluePaint,
    implementOrangePaint,
    castIronDark,
    chromeSteel,
    hydraulicPiston,
    rubberTire,
    cabGlass,
    headlightEmissive,
    taillightEmissive,
    beaconAmber,
    timberWood,
    villageBrick,
    limePlaster,
    corrugatedTin,
    terracottaRoof,
    asphaltRoad,
    dirtTrack,
    meadowGround,
    goldenGrain,
    skinTone,
    kurtaWhite,
    turbanSaffron,
    contactShadowMat,
  ];

  return {
    tractorRedPaint,
    harvesterGreenPaint,
    jcbYellowPaint,
    truckBluePaint,
    implementOrangePaint,
    castIronDark,
    chromeSteel,
    hydraulicPiston,
    rubberTire,
    cabGlass,
    headlightEmissive,
    taillightEmissive,
    beaconAmber,
    timberWood,
    villageBrick,
    limePlaster,
    corrugatedTin,
    terracottaRoof,
    asphaltRoad,
    dirtTrack,
    meadowGround,
    goldenGrain,
    skinTone,
    kurtaWhite,
    turbanSaffron,
    contactShadowMat,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
