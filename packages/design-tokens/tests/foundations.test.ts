import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlHeight,
  durations,
  elevation,
  layers,
  radius,
  spacing,
  spacingUnit,
  toBoxShadow,
  toCubicBezier,
  typeScale,
} from '../src/index.ts';

test('foundations: whole spacing steps and type line heights sit on the 4 px grid', () => {
  for (const [step, value] of Object.entries(spacing)) {
    assert.equal(value, Number(step) * spacingUnit, `spacing ${step}`);
    if (Number.isInteger(Number(step))) assert.equal(value % spacingUnit, 0, `spacing ${step}`);
  }
  for (const [step, value] of Object.entries(typeScale)) assert.equal(value.lineHeight % 4, 0, step);
});

test('foundations: type scale grows monotonically and tightens tracking as it grows', () => {
  const steps = Object.values(typeScale);
  for (let index = 1; index < steps.length; index += 1) {
    const [previous, current] = [steps[index - 1], steps[index]];
    assert.ok(previous && current && current.size > previous.size);
    assert.ok(current.tracking <= previous.tracking);
  }
});

test('foundations: default control height meets the 44 px touch target', () => {
  assert.ok(controlHeight.md >= 44);
  assert.ok(controlHeight.sm >= 24, 'WCAG 2.2 minimum target size');
});

test('foundations: radii and overlay layers are strictly ordered', () => {
  const radii = Object.values(radius);
  assert.deepEqual([...radii].sort((a, b) => a - b), radii);
  assert.ok(layers.dropdown < layers.modal && layers.modal < layers.toast && layers.toast < layers.tooltip);
});

test('foundations: motion stays fast and serializes to CSS', () => {
  assert.ok(Object.values(durations).every((value) => value <= 400));
  assert.equal(toCubicBezier('standard'), 'cubic-bezier(0.2, 0, 0, 1)');
});

test('foundations: both themes define three elevation levels as valid box-shadows', () => {
  for (const theme of Object.values(elevation)) {
    for (const level of [1, 2, 3] as const) assert.match(toBoxShadow(theme[level]), /^0 \d+px \d+px -?\d+px rgb\(/);
  }
  assert.equal(toBoxShadow(elevation.dark[1]), '0 1px 2px 0px rgb(0 0 0 / 0.4)');
});
