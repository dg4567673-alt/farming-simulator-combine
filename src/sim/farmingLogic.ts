import {
  CropType,
  EconomyState,
  FieldCell,
  FieldDef,
  FieldState,
  ImplementId,
  SoilStage,
  VehicleId,
} from './types';

export function createInitialFields(defs: FieldDef[]): FieldState[] {
  return defs.map((def) => {
    const cells: FieldCell[] = [];
    for (let row = 0; row < def.rows; row++) {
      for (let col = 0; col < def.cols; col++) {
        const stage = def.initialStage;
        const moisture =
          stage === 'watered' || stage === 'growing' ? 0.85 : stage === 'ripe' ? 0.4 : 0.12;
        const growth =
          stage === 'ripe' ? 1.0 : stage === 'growing' ? 0.62 : stage === 'watered' ? 0.15 : 0;
        cells.push({ row, col, stage, moisture, growth });
      }
    }
    return { def, cells, version: 1 };
  });
}

export function getCellWorldCenter(
  def: FieldDef,
  row: number,
  col: number,
): { x: number; z: number } {
  const cellW = (def.maxX - def.minX) / def.cols;
  const cellH = (def.maxZ - def.minZ) / def.rows;
  return {
    x: def.minX + (col + 0.5) * cellW,
    z: def.minZ + (row + 0.5) * cellH,
  };
}

export interface WorkApplyResult {
  cellsChanged: number;
  grainHarvestedKg: number;
  seedsUsedKg: number;
  fieldId: string | null;
  crop: CropType | null;
}

export function applyWorkAtPoint(
  fields: FieldState[],
  workX: number,
  workZ: number,
  workRadius: number,
  toolType: ImplementId | 'harvester' | 'bulldozer',
  economy: EconomyState,
): WorkApplyResult {
  let cellsChanged = 0;
  let grainHarvestedKg = 0;
  let seedsUsedKg = 0;
  let touchedFieldId: string | null = null;
  let touchedCrop: CropType | null = null;

  for (const field of fields) {
    const { def } = field;
    if (
      workX + workRadius < def.minX ||
      workX - workRadius > def.maxX ||
      workZ + workRadius < def.minZ ||
      workZ - workRadius > def.maxZ
    ) {
      continue;
    }

    const cellW = (def.maxX - def.minX) / def.cols;
    const cellH = (def.maxZ - def.minZ) / def.rows;
    const rSq = (workRadius + Math.max(cellW, cellH) * 0.45) ** 2;

    let fieldTouched = false;
    for (const cell of field.cells) {
      const cx = def.minX + (cell.col + 0.5) * cellW;
      const cz = def.minZ + (cell.row + 0.5) * cellH;
      const dx = cx - workX;
      const dz = cz - workZ;
      if (dx * dx + dz * dz > rSq) continue;

      if (toolType === 'plow' || toolType === 'bulldozer') {
        if (cell.stage === 'fallow') {
          cell.stage = 'plowed';
          cell.growth = 0;
          cell.moisture = Math.max(0.15, cell.moisture);
          cellsChanged++;
          fieldTouched = true;
        }
      } else if (toolType === 'seeder') {
        if (cell.stage === 'plowed' && economy.seedsKg >= 1) {
          cell.stage = 'seeded';
          cell.growth = 0.05;
          economy.seedsKg = Math.max(0, economy.seedsKg - 1);
          seedsUsedKg += 1;
          cellsChanged++;
          fieldTouched = true;
        }
      } else if (toolType === 'water_tanker') {
        if (cell.stage === 'seeded' || cell.stage === 'growing' || cell.stage === 'plowed') {
          const wasChanged = cell.moisture < 0.85 || cell.stage === 'seeded';
          cell.moisture = 1.0;
          if (cell.stage === 'seeded') {
            cell.stage = 'watered';
          }
          if (wasChanged) {
            cellsChanged++;
            fieldTouched = true;
          }
        }
      } else if (toolType === 'harvester') {
        if (cell.stage === 'ripe') {
          cell.stage = 'fallow';
          cell.growth = 0;
          cell.moisture = 0.2;
          const yieldKg = def.crop === 'paddy' ? 28 : def.crop === 'wheat' ? 26 : 18;
          grainHarvestedKg += yieldKg;
          economy.totalHarvestedKg += yieldKg;
          cellsChanged++;
          fieldTouched = true;
        }
      }
    }

    if (fieldTouched) {
      field.version++;
      touchedFieldId = def.id;
      touchedCrop = def.crop;
    }
  }

  return {
    cellsChanged,
    grainHarvestedKg,
    seedsUsedKg,
    fieldId: touchedFieldId,
    crop: touchedCrop,
  };
}

/**
 * Advances crop growth across all watered/growing cells.
 * Growth rate is faster when moisture > 0.25 so players see visible crop growth
 * within ~25-35 seconds of real play after watering!
 */
export function stepFieldsGrowth(fields: FieldState[], dt: number): boolean {
  let anyVisualStep = false;
  for (const field of fields) {
    let changed = false;
    for (const cell of field.cells) {
      if (cell.stage === 'watered' || cell.stage === 'growing') {
        const rate = cell.moisture > 0.2 ? 0.032 : 0.008;
        const prevQuantized = Math.floor(cell.growth * 5);
        cell.growth = Math.min(1.0, cell.growth + rate * dt);
        cell.moisture = Math.max(0.15, cell.moisture - 0.006 * dt);
        const nextQuantized = Math.floor(cell.growth * 5);

        if (cell.stage === 'watered' && cell.growth >= 0.25) {
          cell.stage = 'growing';
          changed = true;
        } else if (cell.stage === 'growing' && cell.growth >= 1.0) {
          cell.stage = 'ripe';
          changed = true;
        } else if (nextQuantized !== prevQuantized) {
          changed = true;
        }
      }
    }
    if (changed) {
      field.version++;
      anyVisualStep = true;
    }
  }
  return anyVisualStep;
}

export function summarizeField(field: FieldState): {
  id: string;
  name: string;
  crop: CropType;
  dominantStage: SoilStage;
  progressPct: number;
  moisturePct: number;
} {
  const counts: Record<SoilStage, number> = {
    fallow: 0,
    plowed: 0,
    seeded: 0,
    watered: 0,
    growing: 0,
    ripe: 0,
  };
  let moistureSum = 0;
  let stageScoreSum = 0;
  const stageWeights: Record<SoilStage, number> = {
    fallow: 0,
    plowed: 20,
    seeded: 40,
    watered: 60,
    growing: 80,
    ripe: 100,
  };

  for (const cell of field.cells) {
    counts[cell.stage]++;
    moistureSum += cell.moisture;
    stageScoreSum += stageWeights[cell.stage];
  }

  let dominantStage: SoilStage = 'fallow';
  let maxCount = -1;
  (Object.keys(counts) as SoilStage[]).forEach((st) => {
    if (counts[st] > maxCount) {
      maxCount = counts[st];
      dominantStage = st;
    }
  });

  const n = Math.max(1, field.cells.length);
  return {
    id: field.def.id,
    name: field.def.name,
    crop: field.def.crop,
    dominantStage,
    progressPct: Math.round(stageScoreSum / n),
    moisturePct: Math.round((moistureSum / n) * 100),
  };
}

export function sellGrainToMandi(
  economy: EconomyState,
  grainKg: number,
  crop: CropType = 'wheat',
): { soldKg: number; earnedRupees: number } {
  if (grainKg <= 0) return { soldKg: 0, earnedRupees: 0 };
  const price =
    crop === 'mustard'
      ? economy.mustardPricePerKg
      : crop === 'paddy'
        ? economy.paddyPricePerKg
        : economy.wheatPricePerKg;
  const earnedRupees = Math.round(grainKg * price);
  economy.rupees += earnedRupees;
  economy.totalSoldKg += grainKg;
  return { soldKg: grainKg, earnedRupees };
}

export function buyFuelAtPump(
  economy: EconomyState,
  currentFuel: number,
  fuelCapacity: number,
): { litersAdded: number; costRupees: number } {
  const needed = Math.max(0, fuelCapacity - currentFuel);
  if (needed < 0.5) return { litersAdded: 0, costRupees: 0 };
  const maxAffordable = Math.floor(economy.rupees / economy.dieselPricePerLiter);
  const litersAdded = Math.min(needed, maxAffordable);
  if (litersAdded <= 0) return { litersAdded: 0, costRupees: 0 };
  const costRupees = Math.round(litersAdded * economy.dieselPricePerLiter);
  economy.rupees -= costRupees;
  return { litersAdded, costRupees };
}

export function buySeedsAtMandi(
  economy: EconomyState,
  amountKg = 100,
): { seedsAdded: number; costRupees: number } {
  const pricePerKg = 18;
  const costRupees = amountKg * pricePerKg;
  if (economy.rupees < costRupees) return { seedsAdded: 0, costRupees: 0 };
  economy.rupees -= costRupees;
  economy.seedsKg += amountKg;
  return { seedsAdded: amountKg, costRupees };
}

export function getVehicleActionLabel(
  vehicleId: VehicleId,
  attachedImplement: ImplementId | null,
): string {
  if (vehicleId === 'harvester') return 'Cutter Header';
  if (vehicleId === 'jcb') return 'Excavator Dig';
  if (vehicleId === 'bulldozer') return 'Blade Plow';
  if (vehicleId === 'truck') return 'Tipper / Horn';
  if (attachedImplement === 'plow') return 'Plow Soil';
  if (attachedImplement === 'seeder') return 'Sow Seeds';
  if (attachedImplement === 'water_tanker') return 'Spray Water';
  if (attachedImplement === 'trolley') return 'Tipper Lift';
  return 'PTO Idle';
}
