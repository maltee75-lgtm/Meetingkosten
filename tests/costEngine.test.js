/**
 * Tests des Kostenmodells (ohne Browser, ohne Abhängigkeiten):
 *   node --test tests/
 * Alle Zeitstempel werden explizit übergeben, die Tests sind daher deterministisch.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createCostEngine, ratePerSecond, ratePerHour } from '../js/costEngine.js';
import { formatDuration } from '../js/format.js';

const params = { participants: 5, hourlyRate: 80, overhead: 1 };

test('Rate pro Sekunde entspricht Teilnehmer * Satz * Overhead / 3600', () => {
  assert.equal(ratePerSecond(params), (5 * 80) / 3600);
  assert.equal(ratePerHour(params), 400);
  assert.equal(ratePerSecond({ ...params, overhead: 1.5 }), (5 * 80 * 1.5) / 3600);
});

test('Kosten laufen zeitproportional auf', () => {
  const engine = createCostEngine(params);
  engine.start(0);
  const afterOneMinute = engine.sample(60_000);
  assert.equal(afterOneMinute.running, true);
  assert.equal(afterOneMinute.elapsedMs, 60_000);
  assert.ok(Math.abs(afterOneMinute.cost - 400 / 60) < 1e-9); // 400 EUR/h -> 6,67 EUR/min
});

test('Parameteränderung wirkt nur für die Zukunft (segmentweise Akkumulation)', () => {
  const engine = createCostEngine(params);
  engine.start(0);
  engine.setParams({ participants: 10 }, 60_000);
  const sample = engine.sample(120_000);

  const expected = 60 * ratePerSecond(params) + 60 * ratePerSecond({ ...params, participants: 10 });
  assert.ok(Math.abs(sample.cost - expected) < 1e-9);
  assert.equal(sample.elapsedMs, 120_000);
  assert.equal(sample.segments.length, 1, 'die Änderung schließt ein Segment ab');
  assert.equal(sample.segments[0].participants, 5);
  assert.ok(Math.abs(sample.personHours - (60 * 5 + 60 * 10) / 3600) < 1e-9);
});

test('Pausierte Zeit kostet nichts', () => {
  const engine = createCostEngine(params);
  engine.start(0);
  engine.pause(30_000);
  const paused = engine.sample(600_000);
  assert.equal(paused.running, false);
  assert.equal(paused.elapsedMs, 30_000);

  engine.start(600_000);
  const resumed = engine.sample(630_000);
  assert.equal(resumed.elapsedMs, 60_000);
  assert.ok(Math.abs(resumed.cost - 60 * ratePerSecond(params)) < 1e-9);
});

test('Doppelter Start und doppelte Pause bleiben wirkungslos', () => {
  const engine = createCostEngine(params);
  assert.equal(engine.start(0), true);
  assert.equal(engine.start(10_000), false, 'zweiter Start wird ignoriert');
  assert.equal(engine.sample(20_000).elapsedMs, 20_000);
  assert.equal(engine.pause(20_000), true);
  assert.equal(engine.pause(30_000), false, 'zweite Pause wird ignoriert');
  assert.equal(engine.sample(40_000).elapsedMs, 20_000);
});

test('Rückwärts laufende Uhr erzeugt keine negativen Werte', () => {
  const engine = createCostEngine(params);
  engine.start(100_000);
  const sample = engine.sample(90_000); // z. B. Zeitumstellung oder NTP-Sprung
  assert.equal(sample.elapsedMs, 0);
  assert.equal(sample.cost, 0);
});

test('Zurücksetzen leert Zeit, Kosten und Verlauf', () => {
  const engine = createCostEngine(params);
  engine.start(0);
  engine.pause(60_000);
  engine.reset();
  const sample = engine.sample(60_000);
  assert.equal(sample.elapsedMs, 0);
  assert.equal(sample.cost, 0);
  assert.equal(sample.segments.length, 0);
  assert.equal(sample.startedAt, null);
});

test('Zustand lässt sich sichern und wiederherstellen (Reload während des Meetings)', () => {
  const engine = createCostEngine(params);
  engine.start(0);
  engine.setParams({ hourlyRate: 100 }, 60_000);
  const snapshot = JSON.parse(JSON.stringify(engine.toJSON()));

  const restored = createCostEngine(params);
  assert.equal(restored.restore(snapshot), true);
  assert.equal(restored.isRunning(), true);

  const a = engine.sample(120_000);
  const b = restored.sample(120_000);
  assert.ok(Math.abs(a.cost - b.cost) < 1e-9);
  assert.equal(a.elapsedMs, b.elapsedMs);
  assert.deepEqual(b.params, { participants: 5, hourlyRate: 100, overhead: 1 });
});

test('Unbekannte Snapshot-Version wird abgelehnt', () => {
  const engine = createCostEngine(params);
  assert.equal(engine.restore({ version: 99 }), false);
  assert.equal(engine.restore(null), false);
});

test('Kosten je Teilnehmer und Dauerformat', () => {
  const engine = createCostEngine({ participants: 4, hourlyRate: 90, overhead: 1 });
  engine.start(0);
  const sample = engine.sample(3_600_000);
  assert.ok(Math.abs(sample.cost - 360) < 1e-9);
  assert.ok(Math.abs(sample.costPerParticipant - 90) < 1e-9);
  assert.equal(formatDuration(sample.elapsedMs), '01:00:00');
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(45_296_000), '12:34:56');
});
