<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const host = ref(null)
const mode = ref('inside')
const expanded = ref(false)
const paused = ref(false)
const ready = ref(false)
const failed = ref(false)
const sound = ref(false)
const audioError = ref(false)
const captions = {
  inside: '今天下雨了，很大。隔着窗，雨像是另一个世界的声音。',
  outside: '我会主动选择淋雨。雨点一滴一滴点在身上，很凉。',
  after: '滴答，滴答。我以为是风扇坏了。哦，原来是雨后，雨从窗台上滴下来了。'
}
let world
let audio
let makeAudio
let disposed = false
function changeMode(value) {
  mode.value = value
  world?.setMode(value)
  audio?.setMode(value)
}
function togglePause() {
  paused.value = !paused.value
  world?.pause(paused.value)
}
async function toggleSound() {
  if (sound.value) {
    audio?.dispose()
    audio = null
    sound.value = false
    return
  }
  try {
    audio = makeAudio()
    audio.setMode(mode.value)
    await audio.resume()
    sound.value = true
    audioError.value = false
  } catch {
    audio?.dispose()
    audio = null
    audioError.value = true
  }
}
async function readArticle() {
  expanded.value = false
  audio?.dispose()
  audio = null
  sound.value = false
  await nextTick()
  const article = document.getElementById('rain-article')
  article?.focus({ preventScroll: true })
  if (article) window.scrollTo({ top: scrollY + article.getBoundingClientRect().top - 100, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
onMounted(async () => {
  try {
    const module = await import('./rainWorld.js')
    if (disposed) return
    makeAudio = module.createRainAudio
    world = module.createRainWorld(host.value)
    ready.value = true
  } catch { failed.value = true }
})
onBeforeUnmount(() => { disposed = true; world?.dispose(); audio?.dispose() })
</script>

<template>
  <section class="rain-scene" :class="{ expanded }" aria-label="雨夜：交互式三维场景" @keydown.esc="expanded = false">
    <div ref="host" class="rain-world"></div>
    <header>
      <div><span class="eyebrow">雨 / 2026.9.25 凌晨</span><p>{{ mode === 'outside' ? '站在雨里' : '窗边，还有一盏灯' }}</p></div>
      <button @click="expanded = !expanded">{{ expanded ? '收起场景 ↙' : '展开雨夜 ↗' }}</button>
    </header>
    <p v-if="!ready" class="loading" role="status">{{ failed ? '三维场景暂不可用，仍可阅读下方原文。' : '雨夜正在展开…' }}</p>
    <template v-else>
      <div class="ambient-controls">
        <button :aria-pressed="sound" @click="toggleSound">{{ sound ? '关闭声音' : '摘下耳机 · 开启声音' }}</button>
        <button :aria-pressed="paused" @click="togglePause">{{ paused ? '继续动态' : '暂停动态' }}</button>
      </div>
      <div class="rain-dialogue" aria-live="polite">
        <p>{{ captions[mode] }}</p>
        <div class="actions">
          <button v-if="mode === 'inside'" class="primary" @click="changeMode('outside')">走出去，淋一会儿雨</button>
          <button v-if="mode === 'outside'" class="primary" @click="changeMode('inside')">回到窗边</button>
          <button v-if="mode !== 'after'" @click="changeMode('after')">等到雨停</button>
          <button v-if="mode === 'after'" class="primary" @click="readArticle">阅读文章</button>
          <button v-if="mode === 'after'" @click="changeMode('inside')">再听一场雨</button>
        </div>
        <small v-if="audioError">声音无法开启，你仍然可以继续体验。</small>
      </div>
    </template>
  </section>
  <p class="scene-note">雨夜的文学演绎 · 声音默认关闭，开启后播放真实录音（滴水为水龙头落入水碗的替代素材） · 不采集数据 · <a href="/audio/CREDITS.md" target="_blank" rel="noopener">声音来源与许可</a></p>
</template>

<style scoped>
.rain-scene { position: relative; height: 650px; margin: 28px 0 0; background: #17212b; color: #eee6d4; overflow: hidden; isolation: isolate; }
.rain-scene.expanded { position: fixed; inset: 16px; height: auto; margin: 0; z-index: 100; }
.rain-world { position: absolute; inset: 0; }
.rain-world :deep(canvas) { display: block; width: 100%; height: 100%; }
header { position: absolute; inset: 0 0 auto; display: flex; justify-content: space-between; gap: 12px; padding: 22px; background: linear-gradient(#141e29dc, transparent); }
.eyebrow { font-size: 11px; letter-spacing: .15em; color: #c2cbd0; }
header p { font: 24px/1.5 'Songti SC', serif; margin: 10px 0 0; }
.rain-scene button { color: #e9e1ce; background: #25333cda; border: 1px solid #a2b3b655; border-radius: 2px; font-size: 12px; min-height: 44px; padding: 9px 13px; cursor: pointer; }
header button { align-self: flex-start; }
.rain-scene button:hover { background: #47575e; }
.rain-scene button:focus-visible { outline: 2px solid #f1d5a2; outline-offset: 3px; }
.ambient-controls { position: absolute; top: 116px; left: 22px; display: flex; flex-wrap: wrap; gap: 8px; }
.rain-dialogue { position: absolute; bottom: 22px; left: 22px; right: 22px; background: #182731e8; border-top: 1px solid #c2bea655; padding: 20px; backdrop-filter: blur(10px); max-height: calc(100% - 190px); overflow: auto; }
.rain-dialogue p { font: 17px/1.9 'Songti SC', serif; margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
.rain-scene .primary { background: #d1c4a8; color: #263741; }
.loading { position: absolute; top: 40%; left: 20%; right: 20%; }
.scene-note { color: var(--vp-c-text-2); font-size: 11px; margin: 8px 0 30px; }
@media (max-width: 600px) {
  .rain-scene { margin-left: -12px; margin-right: -12px; }
  .rain-scene.expanded { inset: 0; margin: 0; }
  header { padding: 16px; } header p { font-size: 20px; }
  .ambient-controls { left: 16px; }
  .rain-dialogue { left: 12px; right: 12px; bottom: 12px; padding: 15px; }
}
</style>
