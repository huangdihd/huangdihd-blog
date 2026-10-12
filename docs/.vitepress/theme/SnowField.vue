<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { kept } from './snowState.mjs'

// 坐标系里的雪：首屏背景是一张静止的坐标纸，雪从上方飘落穿过它。
// - 雪花经过格点时，格点短暂亮起再慢慢暗下去，像被「采样」了一下
// - 每片雪都按一组显式的位移方程运动，方程写在坐标纸的角上
// - 靠近鼠标的雪花被拨开，横向划动带起一阵风
const props = defineProps({
  // y 轴对齐到这个元素的左边缘（首屏文字），找不到时贴着左侧
  alignTo: { type: String, default: '' }
})
// 每次布局后告诉外面坐标原点和格距，首页图注用它算头像在坐标系里的位置
const emit = defineEmits(['layout'])

const canvas = ref(null)
const { isDark } = useData()

const G = 32 // 格距（px）
const LABEL_EVERY = 4 // 每隔几格标一个数字
const REPEL_RADIUS = 120
const REPEL_FORCE = 2.2
const DENSITY = 1 / 4200

const PALETTE = {
  dark: { dot: '238, 238, 241', axis: '170, 185, 214', label: '#9C9EA8', flake: '#FFFFFF', flakeAlpha: 1, rim: '', dotBase: 0.11, glow: 0.75 },
  light: { dot: '28, 29, 34', axis: '66, 83, 122', label: '#6E707A', flake: '#FFFFFF', flakeAlpha: 1, rim: '66, 83, 122', dotBase: 0.09, glow: 0.6 }
}

let ctx, width, height, dpr, frame, observer, resizeObserver
let flakes = []
let origin = { x: 0, y: 0 }
let cols = 0, rows = 0, colStart = 0, rowStart = 0
let glow = new Float32Array(0)
let visible = true
let wind = 0
let reduced = false
const pointer = { x: 0, y: 0, active: false, lastX: null }
let colors = PALETTE.dark
let font = '11px monospace'
let legendFont = 'italic 15px serif'
let lastT = null

// 位移方程（坐标系单位：1 = 一格，t 以秒计，y 向上为正）：
//   x(t) = x₀ + A·sin(ωt + φ)
//   y(t) = y₀ − v·t
// 鼠标拨开、风吹这些外力只改变方程里的常数 x₀、y₀，所以方程始终描述雪花此刻真实的轨迹
function makeFlake(t, randomY = true) {
  const depth = Math.random()
  const v = 0.35 + depth * 0.9
  const top = origin.y / G + 0.2
  const bottom = -(height - origin.y) / G - 0.2
  const uy = randomY ? bottom + Math.random() * (top - bottom) : top
  return {
    x0: (Math.random() * width - origin.x) / G,
    y0: uy + v * t,
    A: 0.15 + Math.random() * 0.35,
    w: 0.6 + Math.random() * 1.0,
    phi: Math.random() * Math.PI * 2,
    v,
    depth,
    kx: 0, // 风带来的水平速度（px/帧）
    r: 0.8 + depth * 1.7,
    alpha: 0.45 + depth * 0.5,
    px: 0,
    py: 0
  }
}

function position(f, t) {
  return { ux: f.x0 + f.A * Math.sin(f.w * t + f.phi), uy: f.y0 - f.v * t }
}

function layout() {
  const el = canvas.value
  const host = el.parentElement
  const rect = host.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = rect.width
  height = rect.height
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 原点：y 轴贴着首屏文字左侧一格，x 轴在首屏底部往上一格半
  const target = props.alignTo ? host.querySelector(props.alignTo) : null
  const left = target ? target.getBoundingClientRect().left - rect.left : G
  origin = { x: Math.max(12, Math.round(left - G * 0.75)), y: Math.round(height - G * 1.5) }

  colStart = -Math.ceil(origin.x / G)
  cols = Math.ceil((width - origin.x) / G) - colStart + 1
  rowStart = -Math.floor((height - origin.y) / G)
  rows = Math.ceil(origin.y / G) - rowStart + 1
  glow = new Float32Array(cols * rows)

  // 尺寸和原点都没变（比如站内切页面回来）就沿用原来的雪，否则重新撒一遍
  const same = kept.flakes &&
    Math.abs(kept.width - width) < 2 && Math.abs(kept.height - height) < 2 &&
    kept.originX === origin.x && kept.originY === origin.y
  if (same) {
    flakes = kept.flakes
  } else {
    const now = performance.now() / 1000
    const count = Math.round(width * height * DENSITY)
    flakes = Array.from({ length: count }, () => makeFlake(now))
  }
  Object.assign(kept, { flakes, width, height, originX: origin.x, originY: origin.y })

  const root = getComputedStyle(document.documentElement)
  const mono = root.getPropertyValue('--vp-font-family-mono').trim()
  const serif = root.getPropertyValue('--aling-serif').trim()
  font = `11px ${mono || 'monospace'}`
  legendFont = `italic 15px ${serif || 'serif'}`
  colors = isDark.value ? PALETTE.dark : PALETTE.light
  emit('layout', { originX: origin.x, originY: origin.y, grid: G })
}

// 格点 (i, j)：i 向右为正，j 向上为正
const gx = (i) => origin.x + i * G
const gy = (j) => origin.y - j * G

function drawGrid() {
  const c = colors
  for (let r = 0; r < rows; r++) {
    const j = rowStart + r
    const y = gy(j)
    for (let k = 0; k < cols; k++) {
      const i = colStart + k
      const g = glow[r * cols + k]
      const a = c.dotBase + g * c.glow
      ctx.fillStyle = `rgba(${c.dot}, ${a.toFixed(3)})`
      const size = 1 + g * 1.2
      ctx.fillRect(gx(i) - size / 2, y - size / 2, size, size)
    }
  }

  // 坐标轴
  ctx.strokeStyle = `rgba(${c.axis}, 0.35)`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, origin.y + 0.5)
  ctx.lineTo(width, origin.y + 0.5)
  ctx.moveTo(origin.x + 0.5, 0)
  ctx.lineTo(origin.x + 0.5, height)
  ctx.stroke()

  // 刻度与数字
  ctx.beginPath()
  for (let i = colStart; i < colStart + cols; i++) {
    if (i === 0) continue
    const len = i % LABEL_EVERY === 0 ? 6 : 3
    ctx.moveTo(gx(i) + 0.5, origin.y - len)
    ctx.lineTo(gx(i) + 0.5, origin.y + len)
  }
  for (let j = rowStart; j < rowStart + rows; j++) {
    if (j === 0) continue
    const len = j % LABEL_EVERY === 0 ? 6 : 3
    ctx.moveTo(origin.x - len, gy(j) + 0.5)
    ctx.lineTo(origin.x + len, gy(j) + 0.5)
  }
  ctx.stroke()

  ctx.font = font
  ctx.fillStyle = c.label
  ctx.globalAlpha = 0.7
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = colStart; i < colStart + cols; i++) {
    if (i <= 0 || i % LABEL_EVERY) continue
    ctx.fillText(String(i), gx(i), origin.y + 9)
  }
  // 手机上 y 轴贴着屏幕边，左侧放不下数字，放右侧又会压到首屏文字：只留刻度，原点的 0 放在轴右侧
  const narrow = origin.x < 28
  if (!narrow) {
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let j = 1; j < rowStart + rows; j++) {
      if (j % LABEL_EVERY) continue
      ctx.fillText(String(j), origin.x - 9, gy(j))
    }
  }
  ctx.textAlign = narrow ? 'left' : 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('0', narrow ? origin.x + 6 : origin.x - 6, origin.y + 9)
  ctx.globalAlpha = 1
}

// 方程写在坐标纸左上角，像图表的图例
function drawLegend() {
  const x = origin.x + G * 0.6
  const y = 24
  ctx.font = legendFont
  ctx.fillStyle = colors.label
  ctx.globalAlpha = 0.85
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('x(t) = x₀ + A sin(ωt + φ)', x, y)
  ctx.fillText('y(t) = y₀ − v t', x, y + 21)
  ctx.globalAlpha = 1
}

function step(tms) {
  const t = tms / 1000
  // 以 60 帧为基准的帧长倍数，外力按真实时间作用，帧率不同效果一致
  const k = lastT === null ? 1 : Math.min(3, Math.max(0, (t - lastT) * 60))
  lastT = t

  ctx.clearRect(0, 0, width, height)

  // 格点的亮度慢慢褪去
  const fade = Math.pow(0.968, k)
  for (let n = 0; n < glow.length; n++) glow[n] *= fade

  wind *= Math.pow(0.96, k)
  const top = origin.y / G + 0.2
  const bottom = -(height - origin.y) / G - 0.2
  for (const f of flakes) {
    let { ux, uy } = position(f, t)
    let px = gx(ux)
    let py = gy(uy)

    // 外力：鼠标附近的雪花被推开，越近越强，前景的雪花反应更明显
    if (pointer.active) {
      const dx = px - pointer.x
      const dy = py - pointer.y
      const dist = Math.hypot(dx, dy)
      if (dist < REPEL_RADIUS && dist > 0.01) {
        const push = (1 - dist / REPEL_RADIUS) ** 2 * REPEL_FORCE * (0.4 + f.depth) * k
        f.x0 += ((dx / dist) * push) / G
        f.y0 -= ((dy / dist) * push * 0.6) / G
      }
    }
    // 外力：风
    f.kx = f.kx * Math.pow(0.92, k) + wind * (0.3 + f.depth) * 0.08 * k
    f.x0 += (f.kx * k) / G

    ;({ ux, uy } = position(f, t))
    // 落到底部以下：沿方程整段整段往上平移，换一个横向位置继续落。
    // 标签页切走、滚出视口时动画会暂停，回来时可能已经过去很久，
    // 按落下了几整段来平移，雪在纵向上仍然均匀，不会一齐从顶部重新出现
    if (uy < bottom) {
      const span = top - bottom
      f.y0 += Math.ceil((bottom - uy) / span) * span
      f.x0 = (Math.random() * width - origin.x) / G
      f.kx = 0
      ;({ ux, uy } = position(f, t))
    }
    px = gx(ux)
    if (px < -4) f.x0 += (width + 8) / G
    else if (px > width + 4) f.x0 -= (width + 8) / G
    ;({ ux, uy } = position(f, t))
    f.px = gx(ux)
    f.py = gy(uy)

    // 落到格点附近时点亮它
    const i = Math.round(ux)
    const j = Math.round(uy)
    const ci = i - colStart, rj = j - rowStart
    if (ci >= 0 && ci < cols && rj >= 0 && rj < rows) {
      const d = Math.hypot(ux - i, uy - j) / 0.5
      if (d < 1) {
        const n = rj * cols + ci
        glow[n] = Math.max(glow[n], (1 - d) * (0.5 + f.depth * 0.5))
      }
    }
  }

  drawGrid()
  drawLegend()

  for (const f of flakes) {
    const a = f.alpha * colors.flakeAlpha
    if (colors.rim) {
      // 浅色背景上白雪看不见：在雪花右下方垫一层淡淡的灰蓝阴影，让它像一粒立着的白雪，而不是描了边的圆圈
      ctx.fillStyle = `rgba(${colors.rim}, ${(a * 0.22).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(f.px + 0.4, f.py + 0.9, f.r + 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = colors.flake
    ctx.globalAlpha = colors.rim ? 1 : a
    ctx.beginPath()
    ctx.arc(f.px, f.py, f.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

}

function loop(t) {
  step(t)
  frame = requestAnimationFrame(loop)
}

function start() {
  if (!frame && visible && !document.hidden && !reduced) frame = requestAnimationFrame(loop)
}

function stop() {
  cancelAnimationFrame(frame)
  frame = null
}

function onPointerMove(e) {
  const rect = canvas.value.getBoundingClientRect()
  pointer.x = e.clientX - rect.left
  pointer.y = e.clientY - rect.top
  pointer.active = true
  if (pointer.lastX !== null) {
    wind = Math.max(-6, Math.min(6, wind + (e.clientX - pointer.lastX) * 0.05))
  }
  pointer.lastX = e.clientX
}

function onPointerLeave() {
  pointer.active = false
  pointer.lastX = null
}

function onVisibility() {
  document.hidden ? stop() : start()
}

function onResize() {
  layout()
  if (reduced) step(performance.now())
}

watch(isDark, () => {
  colors = isDark.value ? PALETTE.dark : PALETTE.light
  if (reduced) step(performance.now())
})

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  layout()
  // 盯住首屏本身的尺寸：切页面回来时首屏可能还没排好版，尺寸定下来后再按真实尺寸布局一次
  let lastSize = `${width}x${height}`
  resizeObserver = new ResizeObserver(() => {
    const rect = canvas.value.parentElement.getBoundingClientRect()
    const size = `${rect.width}x${rect.height}`
    if (size === lastSize) return
    lastSize = size
    onResize()
  })
  resizeObserver.observe(canvas.value.parentElement)

  if (reduced) {
    step(performance.now())
    return
  }

  const host = canvas.value.parentElement
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)
  document.addEventListener('visibilitychange', onVisibility)

  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    visible ? start() : stop()
  })
  observer.observe(host)
  start()
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  const host = canvas.value?.parentElement
  host?.removeEventListener('pointermove', onPointerMove)
  host?.removeEventListener('pointerleave', onPointerLeave)
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <canvas ref="canvas" class="snow-field" aria-hidden="true" />
</template>

<style scoped>
.snow-field {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
