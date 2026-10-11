// 把签名板（阿凛签名板）发送的一版签名转成主题用的 docs/.vitepress/theme/signature.json
//
// 用法：node scripts/signature-from-pad.mjs <签名板导出的那一版 JSON> [输出路径]
//
// 处理：
// 1. 两个字写在两个田字格里，间距偏大：把右边的字整体左移，留出 GAP 的间隔
// 2. 用 Ramer–Douglas–Peucker 精简点数，保留每个点的压力与时间
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output = 'docs/.vitepress/theme/signature.json'] = process.argv.slice(2)
if (!input) {
  console.error('用法：node scripts/signature-from-pad.mjs <signature.json> [输出路径]')
  process.exit(1)
}

const GAP = 36 // 两字之间的间隔（逻辑单位，画布宽 1000）
const TOLERANCE = 0.7 // 精简容差，越大点越少

const raw = JSON.parse(readFileSync(input, 'utf8'))
const doc = raw.data ?? raw

const strokes = doc.strokes.map((s) => ({
  size: Number(s.size) || 16,
  points: s.points.split(' ').filter(Boolean).map((chunk) => chunk.split(',').map(Number))
}))

// 按笔画中心落在哪个格子分成左右两个字
const centerX = (s) => s.points.reduce((sum, p) => sum + p[0], 0) / s.points.length
const left = strokes.filter((s) => centerX(s) < doc.width / 2)
const right = strokes.filter((s) => centerX(s) >= doc.width / 2)
const maxLeft = Math.max(...left.flatMap((s) => s.points.map((p) => p[0])))
const minRight = Math.min(...right.flatMap((s) => s.points.map((p) => p[0])))
const shift = minRight - maxLeft - GAP
for (const s of right) for (const p of s.points) p[0] -= shift

function simplify(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = points[a], [bx, by] = points[b]
    const len = Math.hypot(bx - ax, by - ay) || 1
    let maxDist = 0, index = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]
      const dist = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len
      if (dist > maxDist) { maxDist = dist; index = i }
    }
    if (maxDist > tolerance) {
      keep[index] = 1
      stack.push([a, index], [index, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d
const result = {
  strokes: strokes.map((s) => ({
    size: s.size,
    points: simplify(s.points, TOLERANCE).map(([x, y, p, t]) => [round(x), round(y), round(p, 2), Math.round(t)])
  }))
}

writeFileSync(output, JSON.stringify(result) + '\n')
const before = strokes.reduce((n, s) => n + s.points.length, 0)
const after = result.strokes.reduce((n, s) => n + s.points.length, 0)
console.log(`${result.strokes.length} 笔，${before} → ${after} 个点，写入 ${output}`)
