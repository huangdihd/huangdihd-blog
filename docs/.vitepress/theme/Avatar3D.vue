<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { withBase } from 'vitepress'

// 头像是空间里的一块平面，跟随鼠标绕中心旋转；
// 平面里的画面再按深度图分出前后：脸停在平面上，背景朝转动的反方向错开，人物像从画面里浮出来
// 进入页面时画面像扩散模型采样一样，从纯噪声一步步去噪生成出来；点击头像重新生成
const props = defineProps({
  src: { type: String, required: true },
  depth: { type: String, default: '' },
  alt: { type: String, default: '' }
})

const root = ref(null)
const canvas = ref(null)
const ready = ref(false)
const generating = ref(false)
const stepLabel = ref('')

const MAX_TILT = 18 // 最大旋转角度（度）
const EASE = 0.08
const STRENGTH = 0.032 // 视差位移上限，占画面宽度的比例
const FOCAL = 0.75 // 焦平面所在深度：脸部附近，几乎不动
const ZOOM = 1.07 // 略微放大，位移时不露出边缘
const STEPS = 40 // 去噪步数
const GEN_DURATION = 2000 // 生成总时长（毫秒）
const T_MAX = 1000 // 标签上显示的扩散时间步

let frame, observer, gl, uMouse, uProgress, uSeed, uCell
let genStart = 0
let lastStep = -1
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

// 平面转向哪边，比焦平面远的背景就朝反方向错开，比焦平面近的顺着转向
// 生成过程按扩散模型的前向公式合成每一步：x_t = √ᾱ·x̂₀ + √(1−ᾱ)·ε，ᾱ 用余弦调度；
// x̂₀ 是这一步「预测出的原图」，先只有大块的明暗和颜色，越往后细节越多；ε 每一步重新采样
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_image;
uniform sampler2D u_depth;
uniform vec2 u_mouse;
uniform float u_progress;
uniform float u_seed;
uniform float u_cell;
varying vec2 v_uv;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Box-Muller：两个均匀分布变成一个标准正态分布
float gauss(vec2 p) {
  float u1 = max(hash(p), 1e-4);
  float u2 = hash(p + 17.31);
  return sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2);
}

void main() {
  vec2 uv = (v_uv - 0.5) / ${ZOOM.toFixed(3)} + 0.5;
  float d = texture2D(u_depth, uv).r;
  vec2 offset = u_mouse * (${FOCAL.toFixed(2)} - d) * ${STRENGTH.toFixed(4)};
  vec2 p = uv + offset;
  if (u_progress >= 1.0) {
    gl_FragColor = texture2D(u_image, p);
    return;
  }

  // 由粗到细：模糊半径随步数缩小
  float r = pow(1.0 - u_progress, 1.6) * 0.09;
  vec3 c = texture2D(u_image, p).rgb * 0.2;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 2.39996;
    float k = sqrt((float(i) + 0.5) / 12.0);
    c += texture2D(u_image, p + vec2(cos(a), sin(a)) * r * k).rgb * (0.8 / 12.0);
  }

  float s = cos(1.5707963 * (1.0 - u_progress));
  float abar = s * s;
  vec2 cell = floor(gl_FragCoord.xy / u_cell) + u_seed * 101.0;
  vec3 eps = vec3(gauss(cell), gauss(cell + 53.7), gauss(cell + 91.3));
  vec3 x = sqrt(abar) * (c * 2.0 - 1.0) + sqrt(1.0 - abar) * eps;
  gl_FragColor = vec4(clamp(x * 0.5 + 0.5, 0.0, 1.0), 1.0);
}`

function render(t) {
  // 没有鼠标时缓慢自行摆动，手机上也能看出立体感
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

  if (ready.value) {
    if (generating.value) updateGeneration(t)
    gl.uniform2f(uMouse, current.x, current.y)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

// 采样是离散的：每一步噪声重新抽一次，画面一跳一跳地变清楚
function updateGeneration(t) {
  if (!genStart) genStart = t
  const step = Math.min(STEPS, Math.floor(((t - genStart) / GEN_DURATION) * STEPS))
  if (step === lastStep) return
  lastStep = step
  gl.uniform1f(uProgress, step / STEPS)
  gl.uniform1f(uSeed, step)
  stepLabel.value = `t = ${Math.round((1 - step / STEPS) * T_MAX)}`
  if (step === STEPS) generating.value = false
}

function regenerate() {
  if (!ready.value || generating.value) return
  genStart = 0
  lastStep = -1
  generating.value = true
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

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function resize() {
  if (!gl) return
  const el = canvas.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = el.clientWidth * dpr
  el.height = el.clientHeight * dpr
  gl.viewport(0, 0, el.width, el.height)
  // 噪声颗粒约 1.5 个 CSS 像素
  if (uCell) gl.uniform1f(uCell, dpr * 1.5)
}

// 深度视差：WebGL 不可用或加载失败时只保留平面旋转
async function setupDepth() {
  if (!props.depth) return
  gl = canvas.value.getContext('webgl', { premultipliedAlpha: false })
  if (!gl) return
  generating.value = true
  try {
    const [image, depth] = await Promise.all([loadImage(withBase(props.src)), loadImage(withBase(props.depth))])
    if (!canvas.value) return

    const compile = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
      return shader
    }
    const program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    ;[image, depth].forEach((img, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    })
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0)
    gl.uniform1i(gl.getUniformLocation(program, 'u_depth'), 1)
    uMouse = gl.getUniformLocation(program, 'u_mouse')
    uProgress = gl.getUniformLocation(program, 'u_progress')
    uSeed = gl.getUniformLocation(program, 'u_seed')
    uCell = gl.getUniformLocation(program, 'u_cell')
    gl.uniform1f(uProgress, 0)
  } catch {
    gl = null
    generating.value = false
    return
  }
  resize()
  window.addEventListener('resize', resize)
  ready.value = true
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
  setupDepth()
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('resize', resize)
  document.documentElement.removeEventListener('pointerleave', onPointerLeave)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div ref="root" class="avatar-3d" :class="{ ready, generating }" @click="regenerate">
    <div class="layer">
      <img :src="withBase(src)" :alt="alt" width="320" height="320" />
      <canvas ref="canvas" aria-hidden="true" />
      <span class="glare" aria-hidden="true" />
      <span v-if="stepLabel" class="step" aria-hidden="true">{{ stepLabel }}</span>
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

.layer canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.6s;
}

.ready .layer canvas { opacity: 1; }

/* 生成期间底下的原图藏起来，只看画布 */
.generating .layer img { visibility: hidden; }
.generating .layer canvas { transition: none; }

.step {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 3px 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  pointer-events: none;
  transition: opacity 0.8s 0.6s;
}

.avatar-3d:not(.generating) .step { opacity: 0; }

.glare {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255, 255, 255, 0.22), transparent 60%);
  mix-blend-mode: soft-light;
  opacity: var(--go, 0);
  pointer-events: none;
}
</style>
