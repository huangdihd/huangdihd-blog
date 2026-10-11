import data from './signature.json'

// 「阿凛」手写签名：由签名板记录的笔画（坐标、压力、时间）生成
// - outline：按压力算出宽度、两侧偏移围成的笔画轮廓，用来填色
// - center：笔画中线，书写动画沿它展开遮罩
// - delay / duration：按真实书写节奏压缩到 TOTAL 秒内

const TOTAL = 2.8 // 整个签名写完的时长（秒）
const MAX_PAUSE = 260 // 两笔之间的停顿上限（毫秒）
// 签名显示得很小（几十像素高），按书写时的粗细会细成发丝，整体加粗，保留压力带来的粗细变化
const WEIGHT = 2.6

const f = (n) => Math.round(n * 10) / 10

function smooth(points) {
  if (points.length < 3) return points
  return points.map((pt, i) => {
    if (i === 0 || i === points.length - 1) return pt
    const a = points[i - 1], b = points[i + 1]
    return { ...pt, x: (a.x + pt.x * 2 + b.x) / 4, y: (a.y + pt.y * 2 + b.y) / 4 }
  })
}

// 宽度随压力变化，但限制在本笔中位宽度的 1.35 倍以内，避免收笔停顿处鼓出墨团
function radii(points, size) {
  const raw = points.map((pt) => (WEIGHT * size * (0.25 + 0.95 * pt.p)) / 2)
  const median = [...raw].sort((a, b) => a - b)[Math.floor(raw.length / 2)]
  return raw.map((r) => Math.min(r, median * 1.35))
}

function outline(points, r) {
  if (points.length === 1) {
    const { x, y } = points[0], rr = r[0]
    return `M${f(x - rr)} ${f(y)}A${f(rr)} ${f(rr)} 0 1 0 ${f(x + rr)} ${f(y)}A${f(rr)} ${f(rr)} 0 1 0 ${f(x - rr)} ${f(y)}Z`
  }
  const left = [], right = []
  points.forEach((pt, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    let tx = b.x - a.x, ty = b.y - a.y
    const len = Math.hypot(tx, ty) || 1
    tx /= len; ty /= len
    left.push([pt.x - ty * r[i], pt.y + tx * r[i]])
    right.push([pt.x + ty * r[i], pt.y - tx * r[i]])
  })
  const rEnd = r[r.length - 1], rStart = r[0]
  let d = `M${f(left[0][0])} ${f(left[0][1])}`
  for (let i = 1; i < left.length; i++) d += `L${f(left[i][0])} ${f(left[i][1])}`
  const re = right[right.length - 1]
  d += `A${f(rEnd)} ${f(rEnd)} 0 0 0 ${f(re[0])} ${f(re[1])}`
  for (let i = right.length - 2; i >= 0; i--) d += `L${f(right[i][0])} ${f(right[i][1])}`
  d += `A${f(rStart)} ${f(rStart)} 0 0 0 ${f(left[0][0])} ${f(left[0][1])}Z`
  return d
}

function center(points) {
  if (points.length === 1) return `M${f(points[0].x)} ${f(points[0].y)}h0.1`
  return points.map((pt, i) => `${i ? 'L' : 'M'}${f(pt.x)} ${f(pt.y)}`).join('')
}

function build() {
  const strokes = data.strokes.map((s) => {
    const points = smooth(s.points.map(([x, y, p, t]) => ({ x, y, p, t })))
    const r = radii(points, s.size)
    return { points, r, t0: points[0].t, t1: points[points.length - 1].t }
  })

  // 时间轴：保留每笔的书写时长，压缩笔画之间的停顿
  let clock = 0
  const timeline = strokes.map((s, i) => {
    const pause = i === 0 ? 0 : Math.min(MAX_PAUSE, Math.max(60, s.t0 - strokes[i - 1].t1))
    const start = clock + pause
    clock = start + Math.max(80, s.t1 - s.t0)
    return start
  })
  const scale = TOTAL / (clock / 1000)

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const s of strokes) s.points.forEach((pt, i) => {
    x0 = Math.min(x0, pt.x - s.r[i]); y0 = Math.min(y0, pt.y - s.r[i])
    x1 = Math.max(x1, pt.x + s.r[i]); y1 = Math.max(y1, pt.y + s.r[i])
  })
  const pad = 6

  const box = { x: f(x0 - pad), y: f(y0 - pad), width: f(x1 - x0 + pad * 2), height: f(y1 - y0 + pad * 2) }

  return {
    box,
    viewBox: [box.x, box.y, box.width, box.height].join(' '),
    aspect: (x1 - x0 + pad * 2) / (y1 - y0 + pad * 2),
    strokes: strokes.map((s, i) => ({
      outline: outline(s.points, s.r),
      center: center(s.points),
      // 遮罩线宽盖住整笔最宽处，转角处靠圆头补齐
      reveal: f(Math.max(...s.r) * 2 + 3),
      delay: ((timeline[i] / 1000) * scale).toFixed(3),
      duration: ((Math.max(80, s.t1 - s.t0) / 1000) * scale).toFixed(3)
    }))
  }
}

export const signature = build()
