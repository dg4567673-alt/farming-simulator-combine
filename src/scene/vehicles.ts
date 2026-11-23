import * as THREE from 'three';
import { ImplementId, VehicleId } from '../sim/types';
import { SceneMaterials } from './materials';

export interface VehicleVisualRig {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  steerPivots: THREE.Object3D[];
  steeringWheel?: THREE.Object3D;
  reel?: THREE.Object3D;
  headerGroup?: THREE.Object3D;
  boomGroup?: THREE.Object3D;
  stickGroup?: THREE.Object3D;
  bladeGroup?: THREE.Object3D;
  tipperBed?: THREE.Object3D;
  grainMesh?: THREE.Mesh;
  farmerGroup?: THREE.Group;
}

export interface ImplementVisualRig {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  workPart?: THREE.Object3D; // plow frame lowers, spray bar, or trolley tipper bed
  grainMesh?: THREE.Mesh;
}

function addContactShadow(
  parent: THREE.Group,
  mats: SceneMaterials,
  rx: number,
  rz: number,
): void {
  const geo = new THREE.PlaneGeometry(rx * 2, rz * 2);
  geo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(geo, mats.contactShadowMat);
  disc.position.y = 0.018;
  disc.renderOrder = 1;
  parent.add(disc);
}

function makeWheel(
  radius: number,
  width: number,
  mats: SceneMaterials,
  rimColor = 0xd9d4c7,
): THREE.Group {
  const g = new THREE.Group();

  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, mats.rubberTire);
  tire.castShadow = true;
  tire.receiveShadow = true;
  g.add(tire);

  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.35,
    roughness: 0.42,
  });
  const rimGeo = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.03, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  g.add(rim);

  const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.08, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, mats.castIronDark);
  g.add(hub);

  return g;
}

function buildFarmerFigure(mats: SceneMaterials): THREE.Group {
  const farmer = new THREE.Group();

  // Seated torso (Kurta)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.56, 12), mats.kurtaWhite);
  torso.position.set(0, 0.28, 0);
  torso.castShadow = true;
  farmer.add(torso);

  // Gamcha scarf draped over shoulder
  const gamcha = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.26), mats.turbanSaffron);
  gamcha.position.set(-0.14, 0.34, 0.03);
  farmer.add(gamcha);

  // Seated thighs
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.42), mats.castIronDark);
  legs.position.set(0, 0.07, 0.18);
  farmer.add(legs);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), mats.skinTone);
  head.position.set(0, 0.67, 0.02);
  head.castShadow = true;
  farmer.add(head);

  // Traditional Indian Pagdi / Turban
  const turban = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.055, 8, 16), mats.turbanSaffron);
  turban.rotation.x = Math.PI / 2 - 0.15;
  turban.position.set(0, 0.75, 0.01);
  farmer.add(turban);
  const turbanTop = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), mats.turbanSaffron);
  turbanTop.scale.set(1, 0.55, 1);
  turbanTop.position.set(0, 0.77, 0.01);
  farmer.add(turbanTop);

  // Arms reaching forward to steering wheel
  [-0.21, 0.21].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.44, 8), mats.kurtaWhite);
    arm.rotation.x = Math.PI / 2 - 0.32;
    arm.position.set(ax, 0.42, 0.22);
    farmer.add(arm);
  });

  return farmer;
}

export function buildTractorMesh(mats: SceneMaterials): VehicleVisualRig {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const steerPivots: THREE.Object3D[] = [];
  addContactShadow(root, mats, 1.5, 2.5);

  // 1. Cast-iron lower chassis & transmission spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 3.1), mats.castIronDark);
  spine.position.set(0, 0.74, 0.05);
  spine.castShadow = true;
  root.add(spine);

  // 2. Bevelled Engine Bonnet / Hood (ExtrudeGeometry silhouette)
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(0, 0);
  hoodShape.lineTo(1.75, 0);
  hoodShape.lineTo(1.75, 0.62);
  hoodShape.lineTo(0.15, 0.72);
  hoodShape.lineTo(0, 0.65);
  hoodShape.closePath();
  const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 0.78,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  hoodGeo.rotateY(-Math.PI / 2);
  hoodGeo.translate(0.39, 0.92, 1.75);
  const hood = new THREE.Mesh(hoodGeo, mats.tractorRedPaint);
  hood.castShadow = true;
  hood.receiveShadow = true;
  root.add(hood);

  // 3. Silver front radiator grille & bumper weight
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.56, 0.08), mats.chromeSteel);
  grille.position.set(0, 1.24, 1.78);
  root.add(grille);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.32), mats.castIronDark);
  frontBumper.position.set(0, 0.68, 1.85);
  frontBumper.castShadow = true;
  root.add(frontBumper);

  // 4. Twin Front Headlights
  [-0.48, 0.48].forEach((hx) => {
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, 0.16, 12),
      mats.castIronDark,
    );
    housing.rotation.x = Math.PI / 2;
    housing.position.set(hx, 1.26, 1.56);
    root.add(housing);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), mats.headlightEmissive);
    lens.position.set(hx, 1.26, 1.645);
    root.add(lens);
  });

  // 5. Vertical Chrome Exhaust Stack & Muffler
  const muffler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.52, 12),
    mats.castIronDark,
  );
  muffler.position.set(0.42, 1.75, 0.92);
  root.add(muffler);
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.55, 10),
    mats.chromeSteel,
  );
  stack.position.set(0.42, 2.25, 0.92);
  root.add(stack);

  // 6. Wide Rear Mudguards / Fenders & Taillights
  [-0.92, 0.92].forEach((fx) => {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 1.28), mats.tractorRedPaint);
    fender.position.set(fx, 1.56, -0.88);
    fender.castShadow = true;
    root.add(fender);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.06), mats.taillightEmissive);
    tail.position.set(fx, 1.56, -1.53);
    root.add(tail);
  });

  // 7. Operator Platform, Seat, Steering Column & Wheel
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.48), mats.castIronDark);
  seatBase.position.set(0, 1.28, -0.78);
  root.add(seatBase);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.1), mats.castIronDark);
  seatBack.position.set(0, 1.5, -1.0);
  root.add(seatBack);

  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.32), mats.castIronDark);
  dash.position.set(0, 1.32, -0.1);
  root.add(dash);

  const steeringCol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.52, 10),
    mats.castIronDark,
  );
  steeringCol.rotation.x = -0.5;
  steeringCol.position.set(0, 1.55, -0.25);
  root.add(steeringCol);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.024, 8, 18),
    mats.castIronDark,
  );
  steeringWheel.rotation.x = Math.PI / 2 - 0.5;
  steeringWheel.position.set(0, 1.76, -0.37);
  root.add(steeringWheel);

  // 8. ROPS Rollbar & Sun Canopy Hood
  [-0.65, 0.65].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.08), mats.castIronDark);
    post.position.set(px, 2.05, -1.18);
    post.castShadow = true;
    root.add(post);
  });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.07, 1.45), mats.tractorRedPaint);
  canopy.position.set(0, 2.68, -0.75);
  canopy.castShadow = true;
  root.add(canopy);

  // 9. Seated Kisan Driver
  const farmerGroup = buildFarmerFigure(mats);
  farmerGroup.position.set(0, 1.35, -0.74);
  root.add(farmerGroup);

  // 10. Rear 3-point Hydraulic Hitch Arms
  [-0.36, 0.36].forEach((hx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.65), mats.castIronDark);
    arm.position.set(hx, 0.68, -1.78);
    root.add(arm);
  });
  const drawbar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.14), mats.castIronDark);
  drawbar.position.set(0, 0.65, -2.08);
  root.add(drawbar);

  // 11. Front Steerable Axle & Knobby Front Wheels (radius 0.44)
  const frontAxle = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.12, 0.14), mats.castIronDark);
  frontAxle.position.set(0, 0.44, 1.25);
  root.add(frontAxle);

  [-0.78, 0.78].forEach((wx) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.44, 1.25);
    const w = makeWheel(0.44, 0.26, mats, 0xe2ddd2);
    pivot.add(w);
    root.add(pivot);
    steerPivots.push(pivot);
    wheels.push(w);
  });

  // 12. Massive Rear Agricultural Lugged Tires (radius 0.86)
  [-0.92, 0.92].forEach((wx) => {
    const w = makeWheel(0.86, 0.46, mats, 0xe2ddd2);
    w.position.set(wx, 0.86, -0.92);
    root.add(w);
    wheels.push(w);
  });

  return { root, wheels, steerPivots, steeringWheel, farmerGroup };
}

export function buildHarvesterMesh(mats: SceneMaterials): VehicleVisualRig {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const steerPivots: THREE.Object3D[] = [];
  addContactShadow(root, mats, 2.6, 3.8);

  // 1. Main Combine Hull & Threshing Body
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.95, 5.2), mats.harvesterGreenPaint);
  hull.position.set(0, 1.9, -0.4);
  hull.castShadow = true;
  hull.receiveShadow = true;
  root.add(hull);

  // Side accent stripe & engine louvers
  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.26, 4.9), mats.jcbYellowPaint);
  sideStripe.position.set(0, 2.35, -0.4);
  root.add(sideStripe);

  // Rear Radiator Louvers, Straw Chopper Hood, Ladder & Taillights
  const rearHood = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.05, 0.85), mats.castIronDark);
  rearHood.rotation.x = 0.22;
  rearHood.position.set(0, 1.52, -3.05);
  rearHood.castShadow = true;
  root.add(rearHood);

  const louverGrille = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.75, 0.12), mats.chromeSteel);
  louverGrille.position.set(0, 2.32, -2.98);
  root.add(louverGrille);

  [-1.08, 1.08].forEach((tx) => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.08), mats.taillightEmissive);
    tail.position.set(tx, 1.65, -3.02);
    root.add(tail);
  });

  // Side Access Steel Ladder
  [-0.22, 0.22].forEach((lz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), mats.chromeSteel);
    rail.position.set(-1.38, 1.75, 1.45 + lz);
    root.add(rail);
  });

  // Exhaust Pipe on Top Deck
  const harvExhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 1.15, 10),
    mats.castIronDark,
  );
  harvExhaust.position.set(-0.85, 3.45, -1.8);
  root.add(harvExhaust);

  // Grain Hopper Upper Deck
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 2.5), mats.castIronDark);
  hopper.position.set(0, 3.15, -0.6);
  hopper.castShadow = true;
  root.add(hopper);

  const grainMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 2.2), mats.goldenGrain);
  grainMesh.position.set(0, 3.25, -0.6);
  grainMesh.scale.y = 0.05;
  root.add(grainMesh);

  // Unloading Auger Pipe (folded along left side)
  const auger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 4.2, 12),
    mats.chromeSteel,
  );
  auger.rotation.x = Math.PI / 2;
  auger.position.set(1.42, 2.95, -0.8);
  root.add(auger);

  // Panoramic Operator Cab
  const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, 1.5), mats.castIronDark);
  cabFrame.position.set(0, 3.05, 1.65);
  root.add(cabFrame);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.05, 1.56), mats.cabGlass);
  cabGlass.position.set(0, 3.08, 1.65);
  cabGlass.renderOrder = 2;
  root.add(cabGlass);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.14, 1.72), mats.harvesterGreenPaint);
  cabRoof.position.set(0, 3.78, 1.65);
  cabRoof.castShadow = true;
  root.add(cabRoof);

  // Amber warning beacon
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 10), mats.beaconAmber);
  beacon.position.set(0, 3.94, 1.7);
  root.add(beacon);

  // Feeder House & Cutter Header Group (moves down when working)
  const headerGroup = new THREE.Group();
  headerGroup.position.set(0, 0.72, 2.85);
  root.add(headerGroup);

  const feeder = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 1.3), mats.castIronDark);
  feeder.rotation.x = 0.32;
  feeder.position.set(0, 0.45, -0.45);
  headerGroup.add(feeder);

  const cutterDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.55, 1.15), mats.tractorRedPaint);
  cutterDeck.position.set(0, 0.12, 0.35);
  cutterDeck.castShadow = true;
  headerGroup.add(cutterDeck);

  // Rotating Pickup Reel with tines
  const reel = new THREE.Group();
  reel.position.set(0, 0.62, 0.65);
  headerGroup.add(reel);

  const reelAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4.7, 12),
    mats.chromeSteel,
  );
  reelAxle.rotation.z = Math.PI / 2;
  reel.add(reelAxle);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.05, 0.05), mats.jcbYellowPaint);
    bar.position.set(0, Math.cos(angle) * 0.42, Math.sin(angle) * 0.42);
    reel.add(bar);
  }

  // Front Drive Wheels (large)
  [-1.48, 1.48].forEach((wx) => {
    const w = makeWheel(0.95, 0.56, mats, 0xe8b931);
    w.position.set(wx, 0.95, 1.25);
    root.add(w);
    wheels.push(w);
  });

  // Rear Steerable Wheels
  [-1.25, 1.25].forEach((wx) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.58, -2.15);
    const w = makeWheel(0.58, 0.36, mats, 0xe8b931);
    pivot.add(w);
    root.add(pivot);
    steerPivots.push(pivot);
    wheels.push(w);
  });

  return { root, wheels, steerPivots, reel, headerGroup, grainMesh };
}

export function buildJcbMesh(mats: SceneMaterials): VehicleVisualRig {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const steerPivots: THREE.Object3D[] = [];
  addContactShadow(root, mats, 1.7, 2.9);

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.62, 3.6), mats.castIronDark);
  chassis.position.set(0, 0.78, 0);
  chassis.castShadow = true;
  root.add(chassis);

  // Engine Hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 1.5), mats.jcbYellowPaint);
  hood.position.set(0, 1.42, 1.05);
  hood.castShadow = true;
  root.add(hood);

  // Exhaust
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.85, 10), mats.castIronDark);
  stack.position.set(0.38, 2.1, 0.95);
  root.add(stack);

  // Enclosed Glass Cab
  const cabPosts = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.4, 1.48), mats.castIronDark);
  cabPosts.position.set(0, 1.85, -0.35);
  root.add(cabPosts);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.15, 1.54), mats.cabGlass);
  cabGlass.position.set(0, 1.88, -0.35);
  cabGlass.renderOrder = 2;
  root.add(cabGlass);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.14, 1.66), mats.jcbYellowPaint);
  roof.position.set(0, 2.6, -0.35);
  roof.castShadow = true;
  root.add(roof);

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 10), mats.beaconAmber);
  beacon.position.set(0, 2.75, -0.35);
  root.add(beacon);

  // Front Loader Arms & Shovel Bucket (bladeGroup animates up/down)
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0, 1.25, 0.7);
  root.add(bladeGroup);

  [-0.68, 0.68].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 1.85), mats.jcbYellowPaint);
    arm.rotation.x = 0.35;
    arm.position.set(ax, -0.25, 0.9);
    bladeGroup.add(arm);
  });
  const frontBucket = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.68, 0.72), mats.castIronDark);
  frontBucket.position.set(0, -0.62, 1.85);
  frontBucket.castShadow = true;
  bladeGroup.add(frontBucket);

  // Rear Backhoe Excavator Boom + Stick + Toothed Bucket
  const boomGroup = new THREE.Group();
  boomGroup.position.set(0, 1.05, -1.85);
  root.add(boomGroup);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.55, 0.3), mats.jcbYellowPaint);
  boom.rotation.x = -0.35;
  boom.position.set(0, 0.65, -0.28);
  boom.castShadow = true;
  boomGroup.add(boom);

  const stickGroup = new THREE.Group();
  stickGroup.position.set(0, 1.32, -0.52);
  boomGroup.add(stickGroup);

  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.22), mats.castIronDark);
  stick.rotation.x = 0.45;
  stick.position.set(0, -0.45, -0.32);
  stickGroup.add(stick);

  const digBucket = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.56), mats.castIronDark);
  digBucket.position.set(0, -1.02, -0.58);
  stickGroup.add(digBucket);

  // Stabilizer legs
  [-0.85, 0.85].forEach((sx) => {
    const stab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), mats.castIronDark);
    stab.position.set(sx, 0.42, -1.78);
    root.add(stab);
  });

  // Front & Rear Wheels
  [-0.82, 0.82].forEach((wx) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.52, 1.35);
    const w = makeWheel(0.52, 0.3, mats, 0xd99b16);
    pivot.add(w);
    root.add(pivot);
    steerPivots.push(pivot);
    wheels.push(w);
  });
  [-0.88, 0.88].forEach((wx) => {
    const w = makeWheel(0.76, 0.42, mats, 0xd99b16);
    w.position.set(wx, 0.76, -1.05);
    root.add(w);
    wheels.push(w);
  });

  return { root, wheels, steerPivots, bladeGroup, boomGroup, stickGroup };
}

export function buildBulldozerMesh(mats: SceneMaterials): VehicleVisualRig {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  addContactShadow(root, mats, 1.9, 2.7);

  // Left & Right Heavy Crawler Track Assemblies
  [-1.08, 1.08].forEach((tx) => {
    const trackBelt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 3.25), mats.rubberTire);
    trackBelt.position.set(tx, 0.38, -0.1);
    trackBelt.castShadow = true;
    root.add(trackBelt);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 2.95), mats.jcbYellowPaint);
    frame.position.set(tx, 0.42, -0.1);
    root.add(frame);

    [-1.4, 0, 1.4].forEach((rz) => {
      const sprocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.6, 14),
        mats.castIronDark,
      );
      sprocket.rotation.z = Math.PI / 2;
      sprocket.position.set(tx, 0.38, rz - 0.1);
      root.add(sprocket);
      wheels.push(sprocket);
    });
  });

  // Main Armored Body & Engine Hood
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.05, 2.85), mats.jcbYellowPaint);
  body.position.set(0, 1.12, -0.05);
  body.castShadow = true;
  root.add(body);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.82, 0.1), mats.castIronDark);
  grille.position.set(0, 1.15, 1.4);
  root.add(grille);

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 10), mats.castIronDark);
  stack.position.set(0.35, 1.95, 0.55);
  root.add(stack);

  // ROPS Canopy & Operator
  [-0.7, 0.7].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), mats.castIronDark);
    post.position.set(px, 2.1, -1.05);
    root.add(post);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 1.45), mats.jcbYellowPaint);
  roof.position.set(0, 2.68, -0.65);
  roof.castShadow = true;
  root.add(roof);

  const farmer = buildFarmerFigure(mats);
  farmer.position.set(0, 1.62, -0.75);
  root.add(farmer);

  // Heavy Curved Steel Front Dozer Blade
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0, 0.55, 1.65);
  root.add(bladeGroup);

  [-0.95, 0.95].forEach((px) => {
    const pushArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 1.6), mats.jcbYellowPaint);
    pushArm.position.set(px, 0.02, -0.65);
    bladeGroup.add(pushArm);
  });

  const blade = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.24), mats.jcbYellowPaint);
  blade.position.set(0, 0.16, 0.35);
  blade.castShadow = true;
  bladeGroup.add(blade);

  const cuttingEdge = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.18, 0.28), mats.castIronDark);
  cuttingEdge.position.set(0, -0.32, 0.38);
  bladeGroup.add(cuttingEdge);

  return { root, wheels, steerPivots: [], bladeGroup };
}

export function buildTruckMesh(mats: SceneMaterials): VehicleVisualRig {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const steerPivots: THREE.Object3D[] = [];
  addContactShadow(root, mats, 1.6, 3.5);

  // Steel Chassis Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 6.1), mats.castIronDark);
  frame.position.set(0, 0.68, -0.1);
  frame.castShadow = true;
  root.add(frame);

  // Classic Indian Cargo Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.65, 1.9), mats.truckBluePaint);
  cab.position.set(0, 1.62, 1.75);
  cab.castShadow = true;
  root.add(cab);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.92, 0.85), mats.truckBluePaint);
  nose.position.set(0, 1.24, 2.95);
  nose.castShadow = true;
  root.add(nose);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.68, 0.08), mats.cabGlass);
  windshield.position.set(0, 2.02, 2.7);
  windshield.renderOrder = 2;
  root.add(windshield);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.24, 0.22), mats.chromeSteel);
  bumper.position.set(0, 0.72, 3.42);
  root.add(bumper);

  [-0.72, 0.72].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), mats.headlightEmissive);
    lamp.position.set(hx, 1.05, 3.39);
    root.add(lamp);
  });

  // Wooden Cargo Tipper Bed
  const tipperBed = new THREE.Group();
  tipperBed.position.set(0, 0.88, -1.35);
  root.add(tipperBed);

  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.16, 3.9), mats.timberWood);
  bedFloor.position.set(0, 0.08, 0);
  bedFloor.castShadow = true;
  tipperBed.add(bedFloor);

  [-1.08, 1.08].forEach((sx) => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 3.9), mats.timberWood);
    side.position.set(sx, 0.62, 0);
    side.castShadow = true;
    tipperBed.add(side);
  });
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.05, 0.1), mats.timberWood);
  frontWall.position.set(0, 0.62, 1.9);
  tipperBed.add(frontWall);
  const tailGate = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.05, 0.1), mats.implementOrangePaint);
  tailGate.position.set(0, 0.62, -1.9);
  tipperBed.add(tailGate);

  const grainMesh = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.82, 3.65), mats.goldenGrain);
  grainMesh.position.set(0, 0.56, 0);
  tipperBed.add(grainMesh);

  // Front Steerable Wheels
  [-1.02, 1.02].forEach((wx) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.52, 2.25);
    const w = makeWheel(0.52, 0.3, mats, 0xd4d8de);
    pivot.add(w);
    root.add(pivot);
    steerPivots.push(pivot);
    wheels.push(w);
  });

  // Rear Dual-Tire Axle
  [-1.05, 1.05].forEach((wx) => {
    const w = makeWheel(0.56, 0.44, mats, 0xd4d8de);
    w.position.set(wx, 0.56, -1.75);
    root.add(w);
    wheels.push(w);
  });

  return { root, wheels, steerPivots, tipperBed, grainMesh };
}

export function buildVehicleVisual(id: VehicleId, mats: SceneMaterials): VehicleVisualRig {
  switch (id) {
    case 'tractor':
      return buildTractorMesh(mats);
    case 'harvester':
      return buildHarvesterMesh(mats);
    case 'jcb':
      return buildJcbMesh(mats);
    case 'bulldozer':
      return buildBulldozerMesh(mats);
    case 'truck':
      return buildTruckMesh(mats);
  }
}

export function buildImplementVisual(id: ImplementId, mats: SceneMaterials): ImplementVisualRig {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  if (id === 'plow') {
    addContactShadow(root, mats, 1.8, 1.2);
    const workPart = new THREE.Group();
    root.add(workPart);

    // Open tubular steel cultivator frame (front beam + rear beam + crossbars)
    const frontBeam = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.14, 0.14),
      mats.implementOrangePaint,
    );
    frontBeam.position.set(0, 0.72, 0.38);
    frontBeam.castShadow = true;
    workPart.add(frontBeam);

    const rearBeam = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.14, 0.14),
      mats.implementOrangePaint,
    );
    rearBeam.position.set(0, 0.72, -0.38);
    rearBeam.castShadow = true;
    workPart.add(rearBeam);

    [-1.4, 0, 1.4].forEach((cx) => {
      const cross = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.9),
        mats.implementOrangePaint,
      );
      cross.position.set(cx, 0.72, 0);
      workPart.add(cross);
    });

    // 3-Point Hitch Mast
    [-0.25, 0.25].forEach((mx) => {
      const mast = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.75, 0.1),
        mats.implementOrangePaint,
      );
      mast.rotation.z = mx > 0 ? 0.3 : -0.3;
      mast.position.set(mx * 0.6, 1.05, 0.48);
      workPart.add(mast);
    });

    // 9 curved cultivator tynes in two staggered rows
    for (let i = 0; i < 5; i++) {
      const tx = -1.4 + i * 0.7;
      const tyne = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.12), mats.castIronDark);
      tyne.rotation.x = 0.22;
      tyne.position.set(tx, 0.38, 0.35);
      workPart.add(tyne);
    }
    for (let i = 0; i < 4; i++) {
      const tx = -1.05 + i * 0.7;
      const tyne = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.12), mats.castIronDark);
      tyne.rotation.x = 0.22;
      tyne.position.set(tx, 0.38, -0.35);
      workPart.add(tyne);
    }

    [-1.4, 1.4].forEach((wx) => {
      const w = makeWheel(0.26, 0.16, mats, 0x262628);
      w.position.set(wx, 0.26, -0.5);
      root.add(w);
      wheels.push(w);
    });
    return { root, wheels, workPart };
  }

  if (id === 'seeder') {
    addContactShadow(root, mats, 1.9, 1.2);
    const workPart = new THREE.Group();
    root.add(workPart);

    const hopper = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.75, 0.95),
      mats.harvesterGreenPaint,
    );
    hopper.position.set(0, 1.02, 0);
    hopper.castShadow = true;
    workPart.add(hopper);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.02), mats.jcbYellowPaint);
    lid.position.set(0, 1.42, 0);
    workPart.add(lid);

    for (let i = 0; i < 7; i++) {
      const sx = -1.5 + i * 0.5;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.62, 8),
        mats.chromeSteel,
      );
      tube.position.set(sx, 0.42, -0.1);
      workPart.add(tube);
    }

    [-1.85, 1.85].forEach((wx) => {
      const w = makeWheel(0.36, 0.2, mats, 0xe8b931);
      w.position.set(wx, 0.36, 0);
      root.add(w);
      wheels.push(w);
    });
    return { root, wheels, workPart };
  }

  if (id === 'water_tanker') {
    addContactShadow(root, mats, 1.4, 2.4);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 3.6), mats.castIronDark);
    frame.position.set(0, 0.62, 0.2);
    root.add(frame);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.82, 2.8, 20),
      mats.truckBluePaint,
    );
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.45, -0.1);
    tank.castShadow = true;
    root.add(tank);

    const sprayBar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.1, 0.1), mats.chromeSteel);
    sprayBar.position.set(0, 0.75, -1.7);
    root.add(sprayBar);

    [-1.02, 1.02].forEach((wx) => {
      const w = makeWheel(0.56, 0.32, mats, 0xe2ddd2);
      w.position.set(wx, 0.56, -0.15);
      root.add(w);
      wheels.push(w);
    });
    return { root, wheels, workPart: sprayBar };
  }

  // Hydraulic Tractor Trolley
  addContactShadow(root, mats, 1.5, 2.6);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 4.1), mats.castIronDark);
  frame.position.set(0, 0.64, 0.25);
  root.add(frame);

  const tipper = new THREE.Group();
  tipper.position.set(0, 0.76, -1.4);
  root.add(tipper);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 3.4), mats.tractorRedPaint);
  bed.position.set(0, 0.07, 1.4);
  bed.castShadow = true;
  tipper.add(bed);

  [-1.02, 1.02].forEach((sx) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 3.4), mats.tractorRedPaint);
    wall.position.set(sx, 0.52, 1.4);
    wall.castShadow = true;
    tipper.add(wall);
  });

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.85, 0.1), mats.tractorRedPaint);
  frontWall.position.set(0, 0.52, 3.05);
  tipper.add(frontWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.85, 0.1), mats.jcbYellowPaint);
  backWall.position.set(0, 0.52, -0.25);
  tipper.add(backWall);

  const grainMesh = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.72, 3.15), mats.goldenGrain);
  grainMesh.position.set(0, 0.45, 1.4);
  grainMesh.scale.y = 0.01;
  grainMesh.visible = false;
  tipper.add(grainMesh);

  [-1.12, 1.12].forEach((wx) => {
    const w = makeWheel(0.56, 0.34, mats, 0xe2ddd2);
    w.position.set(wx, 0.56, -0.2);
    root.add(w);
    wheels.push(w);
  });

  return { root, wheels, workPart: tipper, grainMesh };
}

export function buildStationaryThresher(mats: SceneMaterials): {
  root: THREE.Group;
  flywheel: THREE.Object3D;
} {
  const root = new THREE.Group();
  addContactShadow(root, mats, 1.8, 2.2);

  const axleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 2.6), mats.castIronDark);
  axleFrame.position.set(0, 0.52, 0);
  root.add(axleFrame);

  [-0.95, 0.95].forEach((wx) => {
    const w = makeWheel(0.45, 0.24, mats, 0xd4d8de);
    w.position.set(wx, 0.45, 0);
    root.add(w);
  });

  // Main Thresher Drum Housing
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 1.55, 18),
    mats.harvesterGreenPaint,
  );
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0, 1.45, 0.1);
  drum.castShadow = true;
  root.add(drum);

  // Feeding Hopper Chute
  const chute = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.45), mats.jcbYellowPaint);
  chute.rotation.x = 0.28;
  chute.position.set(0, 1.58, 1.2);
  chute.castShadow = true;
  root.add(chute);

  // Chaff Blower Chimney
  const blower = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.35, 0.48), mats.tractorRedPaint);
  blower.rotation.x = -0.35;
  blower.position.set(0, 2.35, -0.65);
  blower.castShadow = true;
  root.add(blower);

  // Spinning Flywheel Pulley
  const flywheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.14, 16),
    mats.chromeSteel,
  );
  flywheel.rotation.z = Math.PI / 2;
  flywheel.position.set(1.02, 1.38, 0.1);
  root.add(flywheel);

  return { root, flywheel };
}
