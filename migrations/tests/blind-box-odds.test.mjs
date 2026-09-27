import test from 'node:test'
import assert from 'node:assert/strict'
import { pools, drawVariant } from '../../docs/.vitepress/components/blindBoxOdds.mjs'

test('narrative pools have exact weights and reachable models', () => {
  pools.forEach((pool, stall) => {
    assert.equal(pool.reduce((sum, entry) => sum + entry.weight, 0), 100)
    const counts = new Map()
    for (let i = 0; i < 10000; i++) {
      const variant = drawVariant(stall, () => (i + 0.5) / 10000)
      counts.set(variant, (counts.get(variant) || 0) + 1)
    }
    pool.forEach(entry => assert.equal(counts.get(entry.variant), entry.weight * 100))
    assert.equal(drawVariant(stall, () => 0), pool[0].variant)
    assert.equal(drawVariant(stall, () => 0.999999), pool.at(-1).variant)
  })
  assert.equal(drawVariant(0, () => 0.9), 2)
})
test('random draws are independent and validate the random source', () => {
  assert.equal(drawVariant(1, () => 0.31), 1)
  assert.equal(drawVariant(1, () => 0.31), 1)
  for (const value of [-1, 1, NaN]) assert.throws(() => drawVariant(0, () => value), RangeError)
})
