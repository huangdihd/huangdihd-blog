<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useData } from 'vitepress'

// 首屏近景雪花：缓慢飘落，鼠标靠近时被拨开，横向划动会带起一阵风
const canvas = ref(null)
const { isDark } = useData()

const REPEL_RADIUS = 130
const REPEL_FORCE = 2.4
const DENSITY = 1 / 3200

let ctx, flakes, width, height, dpr, frame, observer
let visible = true
let wind = 0
const pointer = { x: -9999, y: -9999, lastX: null, active: false }

function makeFlake(randomY = true) {
  const depth = Math.random()
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -4,
    r: 0.6 + depth * 1.6,
    vy: 0.15 + depth * 0.45,
    vx: 0,
    alpha: 0.18 + depth * 0.5,
    phase: Math.random() * Math.PI * 2,
    sway: 0.002 + Math.random() * 0.004,
    depth
  }
}

function resize() {
  const el = canvas.value
  const rect = el.parentElement.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = rect.width
  height = rect.height
  el.width = width * dpr
  el.height = height * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const count = Math.round(width * height * DENSITY)
  flakes = Array.from({ length: count }, () => makeFlake())
}

function step(t) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = isDark.value ? '#EEEEF1' : '#42537A'
  wind *= 0.96

  for (const f of flakes) {
    // 鼠标附近的雪花被推开，越近越强，前景的雪花反应更明显
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

    ctx.globalAlpha = f.alpha
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function loop(t) {
  step(t)
  frame = requestAnimationFrame(loop)
}

function start() {
  if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop)
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

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  resize()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    step(0)
    return
  }

  const host = canvas.value.parentElement
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('resize', resize)
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
  window.removeEventListener('resize', resize)
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
