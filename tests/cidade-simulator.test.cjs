'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CityBettingController, seededRandom } = require('../CIDADE-COMPLETA-APOSTAS.cjs');

function run(seed) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    const controller = new CityBettingController(seededRandom(seed));
    controller.initializeCity();
    return controller.executeFullRun(10, 289);
  } finally {
    console.log = originalLog;
  }
}

test('cidade completa executa 289 rodadas sintéticas e reproduz a mesma semente', () => {
  const first = run(42);
  const second = run(42);

  assert.deepEqual(first, second);
  assert.equal(first.roundNumber, 289);
  assert.equal(first.totalBets, 289);
  assert.ok(Number.isFinite(first.currentBankroll));
  assert.ok(first.currentBankroll >= 0);
  assert.equal(first.netProfitOrLoss, Number((first.currentBankroll - 10).toFixed(2)));
});

test('estratégias do provedor não entram em recursão ao exportar o estado local', () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    const controller = new CityBettingController(seededRandom(7));
    controller.initializeCity();

    assert.match(controller.aiOptimizer.getProviderStrategy('PGSOFT').activeTurbines, /COOLING/);
    assert.ok(controller.aiOptimizer.findBestProvider(10).bestProvider);
    assert.equal(controller.exportCityData().runningTurbines.PGSOFT, 0);
  } finally {
    console.log = originalLog;
  }
});
