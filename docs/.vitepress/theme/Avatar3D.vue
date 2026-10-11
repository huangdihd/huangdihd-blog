<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { withBase } from 'vitepress'

// 3D 照片：按深度图让近处（脸、头发）和远处（背景）错开，跟随鼠标产生视差
const props = defineProps({
  src: { type: String, required: true },
  depth: { type: String, required: true },
  alt: { type: String, default: '' }
})

const root = ref(null)
const canvas = ref(null)
const ready = ref(false)

const STRENGTH = 0.028 // 最大位移，占画面宽度的比例
const ZOOM = 1.06 // 略微放大，避免位移时露出边缘
const TILT = 6 // 画框倾斜角度上限（度）

let gl, program, frame, observer, uMouse
let visible = true
const target = { x: 0, y: 0 }
const current = { x: 0, y: 0 }
let lastPointer = -Infinity

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_depth;
uniform vec2 u_mouse;
varying vec2 v_uv;
void main() {
  vec2 uv = (v_uv - 0.5) / ${ZOOM.toFixed(3)} + 0.5;
  float d = texture2D(u_depth, uv).r;
  // 近处随鼠标方向移动，远处反向，焦平面在中间深度
  vec2 offset = u_mouse * (d - 0.45) * ${STRENGTH.toFixed(4)};
  gl_FragColor = texture2D(u_image, uv + offset);
}`

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function compile(type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
  return shader
}

function texture(unit, img) {
  const tex = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
}

function resize() {
  const el = canvas.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = el.clientWidth * dpr
  el.height = el.clientHeight * dpr
  gl.viewport(0, 0, el.width, el.height)
}

function render(t) {
  // 一段时间没有鼠标时，缓慢自己晃动，手机上也能看出纵深
  if (t - lastPointer > 2500) {
    target.x = Math.sin(t * 0.0006) * 0.6
    target.y = Math.sin(t * 0.0009 + 1) * 0.35
  }
  current.x += (target.x - current.x) * 0.06
  current.y += (target.y - current.y) * 0.06

  gl.uniform2f(uMouse, current.x, current.y)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  root.value.style.setProperty('--rx', `${(-current.y * TILT).toFixed(2)}deg`)
  root.value.style.setProperty('--ry', `${(current.x * TILT).toFixed(2)}deg`)
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

// 以头像中心为原点，按视口大小归一化，整页任意位置移动鼠标都有反应
function onPointerMove(e) {
  const rect = root.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)))
  target.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)))
  lastPointer = performance.now()
}

function onVisibility() {
  document.hidden ? stop() : start()
}

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gl = canvas.value.getContext('webgl', { premultipliedAlpha: false })
  if (!gl) return

  try {
    const [image, depth] = await Promise.all([loadImage(withBase(props.src)), loadImage(withBase(props.depth))])
    if (!canvas.value) return

    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    texture(0, image)
    texture(1, depth)
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0)
    gl.uniform1i(gl.getUniformLocation(program, 'u_depth'), 1)
    uMouse = gl.getUniformLocation(program, 'u_mouse')
  } catch {
    // 加载或编译失败时保留静态头像
    return
  }

  resize()
  ready.value = true
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('resize', resize)
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
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div ref="root" class="avatar-3d" :class="{ ready }">
    <div class="layer">
      <img :src="withBase(src)" :alt="alt" width="320" height="320" />
      <canvas ref="canvas" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.avatar-3d {
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transform-style: preserve-3d;
  will-change: transform;
}

.layer {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.layer img,
.layer canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.layer img { display: block; }

.layer canvas {
  opacity: 0;
  transition: opacity 0.6s;
}

.avatar-3d.ready canvas { opacity: 1; }
</style>
