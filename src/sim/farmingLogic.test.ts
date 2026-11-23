import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWorkAtPoint,
  buyFuelAtPump,
  buySeedsAtMandi,
  createInitialFields,
  getCellWorldCenter,
  sellGrainToMandi,
  stepFieldsGrowth,
  summarizeField,
} from './farmingLogic';
import { createInitialEconomy, FIELD_DEFS } from './worldLayout';

test('full agricultural cycle transitions fallow -> plowed -> seeded -> watered -> growing -> ripe -> harvested', () => {
  const fields = createInitialFields(FIELD_DEFS);
  const economy = createInitialEconomy();
  const wheatField = fields[0];
  assert.equal(wheatField.def.initialStage, 'fallow');

  const center = getCellWorldCenter(wheatField.def, 5, 5);

  // 1. Plowing
  const plowRes = applyWorkAtPoint(fields, center.x, center.z, 2.2, 'plow', economy);
  assert.ok(plowRes.cellsChanged >= 1);
  assert.equal(wheatField.cells[5 * wheatField.def.cols + 5].stage, 'plowed');

  // 2. Seeding consumes seeds
  const seedsBefore = economy.seedsKg;
  const seedRes = applyWorkAtPoint(fields, center.x, center.z, 2.2, 'seeder', economy);
  assert.ok(seedRes.cellsChanged >= 1);
  assert.equal(economy.seedsKg, seedsBefore - seedRes.seedsUsedKg);
  assert.equal(wheatField.cells[5 * wheatField.def.cols + 5].stage, 'seeded');

  // 3. Watering raises moisture & transitions seeded -> watered
  const waterRes = applyWorkAtPoint(fields, center.x, center.z, 2.2, 'water_tanker', economy);
  assert.ok(waterRes.cellsChanged >= 1);
  const cell = wheatField.cells[5 * wheatField.def.cols + 5];
  assert.equal(cell.stage, 'watered');
  assert.equal(cell.moisture, 1.0);

  // 4. Growth advances watered -> growing -> ripe
  for (let i = 0; i < 40; i++) {
    stepFieldsGrowth(fields, 1.0);
  }
  assert.equal(cell.stage, 'ripe');

  // 5. Harvesting ripe cells yields grain & resets cell to fallow
  const harvestRes = applyWorkAtPoint(fields, center.x, center.z, 2.2, 'harvester', economy);
  assert.ok(harvestRes.grainHarvestedKg >= 26);
  assert.equal(cell.stage, 'fallow');
});

test('Mandi selling, seed purchase, and Petrol Pump refueling update economy accurately', () => {
  const economy = createInitialEconomy();
  const startRupees = economy.rupees;

  const sale = sellGrainToMandi(economy, 500, 'wheat');
  assert.equal(sale.soldKg, 500);
  assert.equal(sale.earnedRupees, 500 * economy.wheatPricePerKg);
  assert.equal(economy.rupees, startRupees + sale.earnedRupees);

  const seedBuy = buySeedsAtMandi(economy, 100);
  assert.equal(seedBuy.seedsAdded, 100);
  assert.equal(economy.seedsKg, 280);

  const fuelBuy = buyFuelAtPump(economy, 25, 65);
  assert.equal(fuelBuy.litersAdded, 40);
  assert.equal(fuelBuy.costRupees, 40 * economy.dieselPricePerLiter);
});

test('summarizeField computes dominant stage and moisture percentage', () => {
  const fields = createInitialFields(FIELD_DEFS);
  const paddySummary = summarizeField(fields[1]);
  assert.equal(paddySummary.dominantStage, 'ripe');
  assert.equal(paddySummary.progressPct, 100);
});
