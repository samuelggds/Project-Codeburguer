import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceToReais, formatPriceInput, formatAdminMoney } from '../src/features/admin/utils.js';

test('admin prices preserve decimal reais, accepting Brazilian comma without rounding invalid amounts', () => {
  for (const [input, result] of [['29,90', '29.90'], [' 32.5 ', '32.50'], ['0,01', '0.01'], ['99', '99.00'], ['99999999,99', '99999999.99']]) {
    assert.equal(parsePriceToReais(input), result);
  }
  for (const value of ['', '0', '-1', '1,234', '1.234,56', '1e3', 'NaN', '100000000', null]) {
    assert.equal(parsePriceToReais(value), '', String(value));
  }
  assert.equal(formatPriceInput('29.90'), '29,90');
  assert.match(formatAdminMoney('29.90'), /29,90/);
});
