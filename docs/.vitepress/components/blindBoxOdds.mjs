// Fictional narrative weights, not real-world odds or visitor statistics.
export const pools = [
  [{ variant: 0, label: '糟糕的早餐', weight: 65 }, { variant: 1, label: '精致的早餐', weight: 5 }, { variant: 2, label: '粪便', weight: 30 }],
  [{ variant: 0, label: '闹钟', weight: 30 }, { variant: 1, label: '钻石', weight: 3 }, { variant: 2, label: '粪便', weight: 27 }, { variant: 3, label: '手枪', weight: 15 }, { variant: 4, label: '假钞', weight: 25 }],
  [{ variant: 0, label: '勋章', weight: 5 }, { variant: 1, label: '锁', weight: 35 }, { variant: 2, label: '粪便', weight: 30 }, { variant: 3, label: '手枪', weight: 10 }, { variant: 4, label: '假钞', weight: 20 }]
]
export function drawVariant(stall, random = Math.random) {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Expected random value in [0, 1)')
  const pool = pools[stall]
  let remaining = value * pool.reduce((sum, entry) => sum + entry.weight, 0)
  for (const entry of pool) {
    remaining -= entry.weight
    if (remaining < 0) return entry.variant
  }
  return pool.at(-1).variant
}
