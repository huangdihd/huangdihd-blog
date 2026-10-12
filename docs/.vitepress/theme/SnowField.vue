<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useData } from 'vitepress'

// 坐标系里的雪：首屏背景是一张静止的坐标纸，雪从上方飘落穿过它。
// - 雪花经过格点时，格点短暂亮起再慢慢暗下去，像被「采样」了一下
// - 鼠标吸附到最近的格点，显示十字线和坐标；靠近的雪花被拨开，横向划动带起一阵风
const props = defineProps({
  // y 轴对齐到这个元素的左边缘（首屏文字），找不到时贴着左侧
  alignTo: { type: String, default: '' }
})

const canvas = ref(null)
const { isDark } = useData()

const G = 32 // 格距（px）
const LABEL_EVERY = 4 // 每隔几格标一个数字
const REPEL_RADIUS = 120
const REPEL_FORCE = 2.2
const DENSITY = 1 / 4200

const PALETTE = {
  dark: { dot: '238, 238, 241', axis: '170, 185, 214', label: '#9C9EA8', cursor: '#AAB9D6', flake: '#FFFFFF', flakeAlpha: 1, rim: '', dotBase: 0.11, glow: 0.75 },
  light: { dot: '28, 29, 34', axis: '66, 83, 122', label: '#6E707A', cursor: '#42537A', flake: '#FFFFFF', flakeAlpha: 1, rim: '66, 83, 122', dotBase: 0.09, glow: 0.6 }
}

let ctx, width, height, dpr, frame, observer
let flakes = []
let origin = { x: 0, y: 0 }
let cols = 0, rows = 0, colStart = 0, rowStart = 0
let glow = new Float32Array(0)
let visible = true
let wind = 0
let reduced = false
const pointer = { x: 0, y: 0, active: false, hover: false, lastX: null }
let colors = PALETTE.dark
let font = '11px monospace'

function makeFlake(randomY = true) {
  const depth = Math.random()
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -4,
    r: 0.8 + depth * 1.7,
    vy: 0.18 + depth * 0.45,
    vx: 0,
    alpha: 0.45 + depth * 0.5,
    phase: Math.random() * Math.PI * 2,
    sway: 0.002 + Math.random() * 0.004,
    depth
  }
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

  const count = Math.round(width * height * DENSITY)
  flakes = Array.from({ length: count }, () => makeFlake())

  const family = getComputedStyle(document.documentElement).getPropertyValue('--vp-font-family-mono').trim()
  font = `11px ${family || 'monospace'}`
  colors = isDark.value ? PALETTE.dark : PALETTE.light
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

function drawCursor() {
  if (!pointer.hover) return
  const i = Math.round((pointer.x - origin.x) / G)
  const j = Math.round((origin.y - pointer.y) / G)
  const x = gx(i), y = gy(j)
  const c = colors

  ctx.strokeStyle = `rgba(${c.axis}, 0.28)`
  ctx.setLineDash([3, 5])
  ctx.beginPath()
  ctx.moveTo(x + 0.5, 0)
  ctx.lineTo(x + 0.5, height)
  ctx.moveTo(0, y + 0.5)
  ctx.lineTo(width, y + 0.5)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = c.cursor
  ctx.beginPath()
  ctx.arc(x, y, 4.5, 0, Math.PI * 2)
  ctx.stroke()

  ctx.font = font
  ctx.fillStyle = c.cursor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`(${i}, ${j})`, x + 9, y - 7)
}

function step(t) {
  ctx.clearRect(0, 0, width, height)

  // 格点的亮度慢慢褪去
  for (let n = 0; n < glow.length; n++) glow[n] *= 0.968

  wind *= 0.96
  for (const f of flakes) {
    if (pointer.active) {
      const dx = f.x - pointer.x
      const dy = f.y - pointer.y
      const dist = Math.hypot(dx, dy)
      if (dist < REPEL_RADIUS && dist > 0.01) {
        const push = (1 - dist / REPEL_RADIUS) ** 2 * REPEL_FORCE * (0.4 + f.depth)
        f.vx += (dx / dist) * push
        f.y += (dy / dist) * push * 0.6
      }
    }
    f.vx = f.vx * 0.92 + wind * (0.3 + f.depth) * 0.08
    f.x += f.vx + Math.sin(t * f.sway + f.phase) * 0.25
    f.y += f.vy

    if (f.y > height + 4) Object.assign(f, makeFlake(false))
    if (f.x < -4) f.x = width + 4
    else if (f.x > width + 4) f.x = -4

    // 落到格点附近时点亮它
    const i = Math.round((f.x - origin.x) / G)
    const j = Math.round((origin.y - f.y) / G)
    const k = i - colStart, r = j - rowStart
    if (k >= 0 && k < cols && r >= 0 && r < rows) {
      const d = Math.hypot(f.x - gx(i), f.y - gy(j)) / (G * 0.5)
      if (d < 1) {
        const n = r * cols + k
        glow[n] = Math.max(glow[n], (1 - d) * (0.5 + f.depth * 0.5))
      }
    }
  }

  drawGrid()

  for (const f of flakes) {
    const a = f.alpha * colors.flakeAlpha
    if (colors.rim) {
      // 浅色背景上白雪看不见：在雪花右下方垫一层淡淡的灰蓝阴影，让它像一粒立着的白雪，而不是描了边的圆圈
      ctx.fillStyle = `rgba(${colors.rim}, ${(a * 0.22).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(f.x + 0.4, f.y + 0.9, f.r + 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (f.depth > 0.6) {
      // 深色背景上，近处的大雪花外面加一圈淡淡的光晕
      ctx.fillStyle = colors.flake
      ctx.globalAlpha = a * 0.14
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r * 2.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = colors.flake
    ctx.globalAlpha = colors.rim ? 1 : a
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.globalAlpha = 1

  drawCursor()
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
  // 只有能悬停的指针（鼠标、Pencil 悬停）才显示坐标光标
  pointer.hover = e.pointerType !== 'touch'
  if (pointer.lastX !== null) {
    wind = Math.max(-6, Math.min(6, wind + (e.clientX - pointer.lastX) * 0.05))
  }
  pointer.lastX = e.clientX
}

function onPointerLeave() {
  pointer.active = false
  pointer.hover = false
  pointer.lastX = null
}

function onVisibility() {
  document.hidden ? stop() : start()
}

function onResize() {
  layout()
  if (reduced) step(0)
}

watch(isDark, () => {
  colors = isDark.value ? PALETTE.dark : PALETTE.light
  if (reduced) step(0)
})

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  layout()
  window.addEventListener('resize', onResize)

  if (reduced) {
    step(0)
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
  window.removeEventListener('resize', onResize)
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
