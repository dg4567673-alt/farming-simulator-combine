import { AABB, ImplementState, VehicleSpec, VehicleState } from './types';
import { WORLD_HALF_EXTENT } from './worldLayout';

export interface DriveInput {
  throttle: number; // -1..1 (W = +1, S = -1)
  steer: number; // -1..1 (A = +1 left, D = -1 right)
  brake: boolean;
}

export function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Resolves circle vs AABB collisions smoothly by sliding out along the minimum overlap axis.
 */
export function resolveWorldCollisions(
  x: number,
  z: number,
  radius: number,
  colliders: AABB[],
): { x: number; z: number; collided: boolean } {
  let cx = Math.max(-WORLD_HALF_EXTENT + radius, Math.min(WORLD_HALF_EXTENT - radius, x));
  let cz = Math.max(-WORLD_HALF_EXTENT + radius, Math.min(WORLD_HALF_EXTENT - radius, z));
  let collided = cx !== x || cz !== z;

  for (const box of colliders) {
    const closestX = Math.max(box.minX, Math.min(cx, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(cz, box.maxZ));
    const dx = cx - closestX;
    const dz = cz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        cx += (dx / dist) * push;
        cz += (dz / dist) * push;
      } else {
        // Center inside box: push out toward nearest edge
        const leftPen = cx - box.minX;
        const rightPen = box.maxX - cx;
        const topPen = cz - box.minZ;
        const botPen = box.maxZ - cz;
        const minPen = Math.min(leftPen, rightPen, topPen, botPen);
        if (minPen === leftPen) cx = box.minX - radius;
        else if (minPen === rightPen) cx = box.maxX + radius;
        else if (minPen === topPen) cz = box.minZ - radius;
        else cz = box.maxZ + radius;
      }
    }
  }

  return { x: cx, z: cz, collided };
}

export function stepVehicleKinematics(
  vehicle: VehicleState,
  spec: VehicleSpec,
  input: DriveInput,
  colliders: AABB[],
  dt: number,
): boolean {
  const hasFuel = vehicle.fuel > 0.01;
  const effThrottle = hasFuel ? input.throttle : 0;

  // Smooth steering wheel response
  const targetSteer = input.steer;
  const steerLerp = 1 - Math.exp(-8 * dt);
  vehicle.steerAngle = vehicle.steerAngle + (targetSteer - vehicle.steerAngle) * steerLerp;

  // Longitudinal dynamics
  if (input.brake) {
    const sign = Math.sign(vehicle.speed);
    const nextSpeed = Math.abs(vehicle.speed) - spec.brakeDecel * dt;
    vehicle.speed = nextSpeed <= 0.05 ? 0 : sign * nextSpeed;
  } else if (effThrottle > 0.05) {
    if (vehicle.speed < -0.2) {
      vehicle.speed = Math.min(0, vehicle.speed + spec.brakeDecel * dt);
    } else {
      vehicle.speed = Math.min(
        spec.maxForwardSpeed,
        vehicle.speed + spec.accel * effThrottle * dt,
      );
    }
  } else if (effThrottle < -0.05) {
    if (vehicle.speed > 0.2) {
      vehicle.speed = Math.max(0, vehicle.speed - spec.brakeDecel * dt);
    } else {
      vehicle.speed = Math.max(
        -spec.maxReverseSpeed,
        vehicle.speed + spec.accel * effThrottle * dt,
      );
    }
  } else {
    // Natural rolling resistance
    const drag = Math.exp(-2.8 * dt);
    vehicle.speed *= drag;
    if (Math.abs(vehicle.speed) < 0.04) vehicle.speed = 0;
  }

  // Turn rate scales with speed (Ackermann feel; bulldozer can pivot slightly at low speed)
  const speedRatio = Math.min(1, Math.abs(vehicle.speed) / 3.5);
  const pivotFactor = spec.id === 'bulldozer' ? Math.max(0.45, speedRatio) : speedRatio;
  const reverseSign = vehicle.speed < -0.1 ? -1 : 1;
  vehicle.heading = normalizeAngle(
    vehicle.heading + vehicle.steerAngle * spec.turnRate * pivotFactor * reverseSign * dt,
  );

  // Move along heading (+Z at heading = 0)
  const fx = Math.sin(vehicle.heading);
  const fz = Math.cos(vehicle.heading);
  const nextX = vehicle.x + fx * vehicle.speed * dt;
  const nextZ = vehicle.z + fz * vehicle.speed * dt;

  const resolved = resolveWorldCollisions(nextX, nextZ, spec.radius, colliders);
  vehicle.x = resolved.x;
  vehicle.z = resolved.z;
  if (resolved.collided) {
    vehicle.speed *= 0.45;
  }

  // Engine RPM & diesel burn
  const loadFactor = vehicle.workActive ? 420 : 0;
  const targetRpm = hasFuel
    ? 780 + Math.abs(effThrottle) * 950 + (Math.abs(vehicle.speed) / spec.maxForwardSpeed) * 550 + loadFactor
    : 0;
  vehicle.rpm = Math.round(vehicle.rpm + (targetRpm - vehicle.rpm) * (1 - Math.exp(-6 * dt)));

  if (hasFuel && (Math.abs(effThrottle) > 0.05 || vehicle.workActive)) {
    const ptoMult = vehicle.workActive ? 1.45 : 1.0;
    const throttleMult = Math.abs(effThrottle) > 0.05 ? 1.0 : 0.45;
    vehicle.fuel = Math.max(0, vehicle.fuel - spec.fuelBurnPerSec * ptoMult * throttleMult * dt);
  }

  return resolved.collided;
}

/**
 * Updates an attached implement's position & heading to trail behind the tractor's rear 3-point/drawbar hitch.
 */
export function stepHitchedImplement(
  tractor: VehicleState,
  tractorSpec: VehicleSpec,
  implement: ImplementState,
  dt: number,
): void {
  const hitchX = tractor.x - Math.sin(tractor.heading) * tractorSpec.hitchOffset;
  const hitchZ = tractor.z - Math.cos(tractor.heading) * tractorSpec.hitchOffset;

  const dx = hitchX - implement.x;
  const dz = hitchZ - implement.z;
  const dist = Math.hypot(dx, dz);

  if (implement.id === 'plow' || implement.id === 'seeder') {
    // 3-point hitch implements track tractor heading firmly with slight flex
    const targetHeading = tractor.heading;
    const diff = normalizeAngle(targetHeading - implement.heading);
    implement.heading = normalizeAngle(implement.heading + diff * (1 - Math.exp(-10 * dt)));
    implement.x = hitchX - Math.sin(implement.heading) * implement.hitchLength;
    implement.z = hitchZ - Math.cos(implement.heading) * implement.hitchLength;
  } else {
    // Drawbar trailers (Water Tanker, Trolley) articulate naturally around the hitch pin
    if (dist > 0.05) {
      const targetHeading = Math.atan2(dx, dz);
      const diff = normalizeAngle(targetHeading - implement.heading);
      implement.heading = normalizeAngle(implement.heading + diff * (1 - Math.exp(-12 * dt)));
    }
    implement.x = hitchX - Math.sin(implement.heading) * implement.hitchLength;
    implement.z = hitchZ - Math.cos(implement.heading) * implement.hitchLength;
  }
}

export function findNearestAttachableImplement(
  tractor: VehicleState,
  tractorSpec: VehicleSpec,
  implementsMap: Record<string, ImplementState>,
  maxDistance = 5.5,
): ImplementState | null {
  const hitchX = tractor.x - Math.sin(tractor.heading) * tractorSpec.hitchOffset;
  const hitchZ = tractor.z - Math.cos(tractor.heading) * tractorSpec.hitchOffset;
  let best: ImplementState | null = null;
  let bestDist = maxDistance;
  for (const imp of Object.values(implementsMap)) {
    if (imp.attachedTo) continue;
    const d = Math.hypot(imp.x - hitchX, imp.z - hitchZ);
    if (d < bestDist) {
      bestDist = d;
      best = imp;
    }
  }
  return best;
}
