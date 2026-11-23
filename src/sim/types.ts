export type VehicleId = 'tractor' | 'harvester' | 'jcb' | 'bulldozer' | 'truck';

export type ImplementId = 'plow' | 'seeder' | 'water_tanker' | 'trolley';

export type CropType = 'wheat' | 'paddy' | 'mustard';

export type SoilStage = 'fallow' | 'plowed' | 'seeded' | 'watered' | 'growing' | 'ripe';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type CameraMode = 'chase' | 'hood' | 'drone';

export interface Vec2 {
  x: number;
  z: number;
}

export interface AABB {
  id: string;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface FieldCell {
  row: number;
  col: number;
  stage: SoilStage;
  moisture: number; // 0..1
  growth: number; // 0..1
}

export interface FieldDef {
  id: string;
  name: string;
  hindiName: string;
  crop: CropType;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cols: number;
  rows: number;
  initialStage: SoilStage;
}

export interface FieldState {
  def: FieldDef;
  cells: FieldCell[];
  version: number; // incremented on visual change
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  hindiName: string;
  maxForwardSpeed: number; // m/s
  maxReverseSpeed: number; // m/s
  accel: number; // m/s^2
  brakeDecel: number; // m/s^2
  turnRate: number; // rad/s at full speed
  radius: number; // collision radius
  hitchOffset: number; // rear hitch offset along -forward
  fuelCapacity: number; // liters
  fuelBurnPerSec: number;
  canHitch: boolean;
  hasToolArm: boolean; // JCB boom or Bulldozer blade
  grainCapacity: number; // kg (harvester / truck)
}

export interface VehicleState {
  id: VehicleId;
  x: number;
  z: number;
  heading: number; // radians; 0 = +Z
  speed: number; // signed m/s
  steerAngle: number; // -1..1 normalized
  rpm: number; // 750..2400
  fuel: number; // liters
  workActive: boolean;
  toolAngle: number; // 0..1 normalized (e.g. blade height / boom reach / header height)
  attachedImplement: ImplementId | null;
  grainStored: number; // kg (for harvester or truck)
}

export interface ImplementState {
  id: ImplementId;
  name: string;
  hindiName: string;
  x: number;
  z: number;
  heading: number;
  radius: number;
  hitchLength: number; // distance from tractor hitch to implement axle
  workWidth: number; // meters
  grainLoad: number; // kg (for trolley)
  grainCapacity: number; // kg (for trolley)
  waterLevel: number; // 0..1 (for water tanker)
  attachedTo: VehicleId | null;
}

export interface ZonePrompt {
  type: 'mandi' | 'pump' | 'thresher' | 'implement' | 'field';
  label: string;
  sublabel: string;
  actionHint?: string;
}

export interface EconomyState {
  rupees: number;
  seedsKg: number;
  totalHarvestedKg: number;
  totalSoldKg: number;
  wheatPricePerKg: number;
  paddyPricePerKg: number;
  mustardPricePerKg: number;
  dieselPricePerLiter: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  activeVehicleId: VehicleId;
  cameraMode: CameraMode;
  speedKmh: number;
  rpm: number;
  fuelPct: number;
  fuelLiters: number;
  attachedImplement: ImplementId | null;
  workActive: boolean;
  toolAngle: number;
  grainCarriedKg: number;
  grainCapacityKg: number;
  rupees: number;
  seedsKg: number;
  totalHarvestedKg: number;
  totalSoldKg: number;
  nearbyPrompt: ZonePrompt | null;
  fieldSummaries: Array<{
    id: string;
    name: string;
    crop: CropType;
    dominantStage: SoilStage;
    progressPct: number;
    moisturePct: number;
  }>;
  timeOfDayLabel: string;
  lastNotice: string | null;
}
