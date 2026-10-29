import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePercentageDiscount, calculateSubtotal } from './pricing.js';

test('cart subtotals use exact integer paise arithmetic', () => {
  assert.equal(calculateSubtotal([
    { priceInPaise: 18900, quantity: 2 },
    { priceInPaise: 19900, quantity: 1 },
  ]), 57700);
});

test('cart pricing rejects invalid prices and quantities', () => {
  assert.throws(() => calculateSubtotal([{ priceInPaise: 10.5, quantity: 1 }]), RangeError);
  assert.throws(() => calculateSubtotal([{ priceInPaise: 100, quantity: 0 }]), RangeError);
});

test('percentage discounts are rounded down to a whole paise', () => {
  assert.equal(calculatePercentageDiscount(19900, 10), 1990);
  assert.equal(calculatePercentageDiscount(19, 10), 1);
});

test('percentage discount inputs are bounded', () => {
  assert.throws(() => calculatePercentageDiscount(100, 101), RangeError);
  assert.throws(() => calculatePercentageDiscount(-1, 10), RangeError);
});
