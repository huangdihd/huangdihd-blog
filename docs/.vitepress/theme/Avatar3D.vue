<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { withBase } from 'vitepress'

// 头像是空间里的一块平面：跟随鼠标绕中心旋转，表面的反光随角度移动
defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' }
})

const root = ref(null)

const MAX_TILT = 18 // 最大旋转角度（度）
const EASE = 0.08

let frame, observer
let visible = true
const target = { x: 0, y: 0 }
const current = { x: 0, y: 0 }
let lastPointer = -Infinity

function render(t) {
  // 没有鼠标时缓慢自行摆动，手机上也能看出是一块立体的平面
  if (t - lastPointer > 3000) {
    target.x = Math.sin(t * 0.0005) * 0.35
    target.y = Math.sin(t * 0.0007 + 1) * 0.2
  }
  current.x += (target.x - current.x) * EASE
  current.y += (target.y - current.y) * EASE

  const style = root.value.style
  style.setProperty('--rx', `${(-current.y * MAX_TILT).toFixed(2)}deg`)
  style.setProperty('--ry', `${(current.x * MAX_TILT).toFixed(2)}deg`)
  // 反光落在朝向鼠标的一侧
  style.setProperty('--gx', `${(50 + current.x * 50).toFixed(1)}%`)
  style.setProperty('--gy', `${(50 + current.y * 50).toFixed(1)}%`)
  style.setProperty('--go', Math.min(1, Math.hypot(current.x, current.y) * 1.2).toFixed(3))
}

function loop(t) {
  render(t)
  frame = requestAnimationFrame(loop)
}

function start() {
  if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop)
}

function stop() {
  cancelAnimationFrame(frame)
  frame = null
}

// 以头像中心为原点，按视口大小归一化，整页任意位置移动鼠标都会让它转动
function onPointerMove(e) {
  const rect = root.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)))
  target.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)))
  lastPointer = performance.now()
}

// 鼠标离开窗口时回正
function onPointerLeave() {
  target.x = 0
  target.y = 0
}

function onVisibility() {
  document.hidden ? stop() : start()
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  window.addEventListener('pointermove', onPointerMove)
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
  document.addEventListener('visibilitychange', onVisibility)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    visible ? start() : stop()
  })
  observer.observe(root.value)
  start()
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  document.documentElement.removeEventListener('pointerleave', onPointerLeave)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div ref="root" class="avatar-3d">
    <div class="layer">
      <img :src="withBase(src)" :alt="alt" width="320" height="320" />
      <span class="glare" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.avatar-3d {
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transform-style: preserve-3d;
  will-change: transform;
}

/* 图片浮在画框衬边之上一点，转动时能看出前后两层 */
.layer {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  transform: translateZ(12px);
}

.layer img {
  display: block;
  width: 100%;
  height: 100%;
}

.glare {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255, 255, 255, 0.22), transparent 60%);
  mix-blend-mode: soft-light;
  opacity: var(--go, 0);
  pointer-events: none;
}
</style>
