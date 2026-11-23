import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findNearestAttachableImplement,
  resolveWorldCollisions,
  stepHitchedImplement,
  stepVehicleKinematics,
} from './vehiclePhysics';
import {
  createInitialImplements,
  createInitialVehicles,
  VEHICLE_SPECS,
  WORLD_COLLIDERS,
} from './worldLayout';

test('tractor accelerates forward along heading=0 (+Z) and consumes diesel', () => {
  const vehicles = createInitialVehicles();
  const tractor = vehicles.tractor;
  const spec = VEHICLE_SPECS.tractor;
  const startZ = tractor.z;
  const startFuel = tractor.fuel;

  for (let i = 0; i < 30; i++) {
    stepVehicleKinematics(
      tractor,
      spec,
      { throttle: 1, steer: 0, brake: false },
      WORLD_COLLIDERS,
      1 / 30,
    );
  }

  assert.ok(tractor.z > startZ + 2, 'Tractor should move forward in +Z');
  assert.ok(tractor.speed > 3, 'Tractor should accelerate');
  assert.ok(tractor.fuel < startFuel, 'Tractor should burn diesel');
});

test('vehicle slides out of AABB building colliders instead of passing through', () => {
  const house = WORLD_COLLIDERS[0]; // farmhouse-main
  const centerX = (house.minX + house.maxX) * 0.5;
  const res = resolveWorldCollisions(centerX, house.maxZ - 0.3, 2.0, WORLD_COLLIDERS);
  assert.equal(res.collided, true);
  assert.ok(res.z >= house.maxZ + 1.99);
});

test('hitched implement trails behind tractor rear hitch and nearest implement detection works', () => {
  const vehicles = createInitialVehicles();
  const imps = createInitialImplements();
  const tractor = vehicles.tractor;
  const spec = VEHICLE_SPECS.tractor;

  // Move tractor forward and update attached plow
  for (let i = 0; i < 20; i++) {
    stepVehicleKinematics(
      tractor,
      spec,
      { throttle: 1, steer: 0.4, brake: false },
      WORLD_COLLIDERS,
      0.05,
    );
    stepHitchedImplement(tractor, spec, imps.plow, 0.05);
  }

  const distToTractor = Math.hypot(tractor.x - imps.plow.x, tractor.z - imps.plow.z);
  assert.ok(distToTractor > 3.2 && distToTractor < 4.5);

  // Move tractor near seeder to verify attachment discovery
  tractor.x = imps.seeder.x;
  tractor.z = imps.seeder.z + spec.hitchOffset + 1.2;
  tractor.heading = 0;
  const nearest = findNearestAttachableImplement(tractor, spec, imps, 4.5);
  assert.equal(nearest?.id, 'seeder');
});
