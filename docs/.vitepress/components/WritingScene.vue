<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const host = ref(null)
const input = ref(null)
const editor = ref(null)
const phase = ref('desk')
const text = ref('')
const expanded = ref(false)
const ready = ref(false)
const failed = ref(false)
let world
let disposed = false
// The same paper-mounted input remains visible after writing; no duplicate text texture.
watch(text, () => world?.write(''))
async function approach() {
  if (!ready.value || phase.value === 'writing') return
  phase.value = 'writing'
  world.approach(true)
  await nextTick()
  input.value?.focus({ preventScroll: true })
}
function leaveOnPaper() {
  if (!text.value.trim()) return
  phase.value = 'left'
  world.approach(true)
}
async function readArticle() {
  expanded.value = false
  await nextTick()
  const article = document.getElementById('writing-article')
  article?.focus({ preventScroll: true })
  if (article) window.scrollTo({ top: scrollY + article.getBoundingClientRect().top - 100, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
onMounted(async () => {
  try {
    const { createWritingWorld } = await import('./writingWorld.js')
    if (disposed) return
    world = createWritingWorld(host.value, approach, editor.value)
    ready.value = true
  } catch { failed.value = true }
})
onBeforeUnmount(() => { disposed = true; world?.dispose(); text.value = '' })
</script>

<template>
  <section class="writing-scene" :class="{ expanded }" aria-label="关于写作：一张不评价你的书桌" @keydown.esc="expanded = false">
    <div ref="host" class="writing-world"></div>
    <div ref="editor" class="paper-editor">
      <textarea id="writing-thought" ref="input" v-model="text" :readonly="phase !== 'writing'" :aria-hidden="phase === 'desk'" :tabindex="phase === 'desk' ? -1 : 0" :class="{ hidden: phase === 'desk' }" maxlength="160" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="在日记纸上写字" aria-describedby="writing-privacy" placeholder="从这里，写下你自己的话。" @click="phase === 'left' && approach()"></textarea>
    </div>
    <header>
      <div><span>关于写作 / 留给自己的一页</span><p>这一次，没有人批改。</p></div>
      <button @click="expanded = !expanded">{{ expanded ? '收起书桌 ↙' : '展开书桌 ↗' }}</button>
    </header>
    <p v-if="!ready" class="loading" role="status">{{ failed ? '书桌暂时无法加载，原文仍可在下方阅读。' : '为你留一盏灯…' }}</p>
    <div v-else class="writing-panel">
      <template v-if="phase === 'desk'">
        <p>「我有许多想法。那么，究竟是什么剥夺了纸张承载我思想的可能？」</p>
        <small>作文书合着。这一页，不需要照着别人写。</small>
        <div class="actions"><button class="primary" @click="approach">坐下来，写一句</button><button @click="readArticle">先阅读文章</button></div>
      </template>
      <template v-else-if="phase === 'writing'">
        <label for="writing-thought">写一句你原本不打算说出来的话。</label>
        <small id="writing-privacy">仅在当前页面内存中；不上传、不保存。最多 160 字符。</small>
        <div class="actions"><button class="primary" :disabled="!text.trim()" @click="leaveOnPaper">留在纸上</button><button @click="text = ''">擦掉</button><button @click="readArticle">阅读文章</button></div>
      </template>
      <template v-else>
        <p class="quiet">文字留在这里。不需要一个分数。</p>
        <div class="actions"><button class="primary" @click="readArticle">阅读文章</button><button @click="approach">继续写</button><button @click="text = ''; approach()">擦掉</button></div>
      </template>
    </div>
  </section>
  <p class="scene-note">文学场景，非真实房间复原 · 输入不会上传或持久保存，刷新或离开本页即清空。</p>
</template>

<style scoped>
.writing-scene { position: relative; height: 670px; margin: 28px 0 0; background: #292c29; color: #eee4cf; overflow: hidden; isolation: isolate; }
.writing-scene.expanded { position: fixed; inset: 16px; height: auto; margin: 0; z-index: 100; }
.writing-world { position: absolute; inset: 0; }
.writing-world :deep(canvas) { width: 100%; height: 100%; display: block; }
header { position: absolute; inset: 0 0 auto; padding: 22px; display: flex; justify-content: space-between; gap: 12px; background: linear-gradient(#242c25e6, transparent); }
header span { font-size: 11px; letter-spacing: .12em; }
header p { font: 24px/1.5 'Songti SC', serif; margin: 9px 0; }
.writing-scene button { cursor: pointer; border: 1px solid #d4c9a955; background: #334137e8; color: #eee4cf; padding: 9px 13px; min-height: 44px; font-size: 12px; border-radius: 2px; }
header button { align-self: flex-start; }
.writing-scene button:hover { background: #52604d; }
.writing-scene button:disabled { opacity: .45; cursor: default; }
.writing-scene .primary { background: #ded0ae; color: #303d33; }
button:focus-visible, textarea:focus-visible { outline: 2px solid #f3dba0; outline-offset: 3px; }
.writing-panel { position: absolute; bottom: 20px; left: 20px; right: 20px; padding: 18px; background: #28372de8; backdrop-filter: blur(10px); border-top: 1px solid #ddca9c55; max-height: calc(100% - 130px); overflow: auto; }
.writing-panel p { font: 17px/1.8 'Songti SC', serif; margin: 0 0 8px; }
.writing-panel small { font-size: 11px; color: #d3cab8; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
label { display: block; font-size: 14px; margin-bottom: 8px; }
.paper-editor { width: 1024px; height: 708px; pointer-events: none; }
.paper-editor textarea { position: absolute; left: 42px; top: 90px; width: 430px; height: 540px; padding: 0; resize: none; background: transparent; color: #333d32; caret-color: #333d32; font: 28px/62px 'Songti SC', serif; border: none; border-radius: 0; pointer-events: auto; outline: none; overflow-y: auto; }
.paper-editor textarea.hidden { visibility: hidden; pointer-events: none; }
.paper-editor textarea::placeholder { color: #82755d; }
.loading { position: absolute; top: 40%; left: 20%; right: 20%; }
.scene-note { font-size: 11px; color: var(--vp-c-text-2); margin: 8px 0 30px; }
@media (max-width: 600px) {
  .writing-scene { margin-left: -12px; margin-right: -12px; }
  .writing-scene.expanded { inset: 0; margin: 0; }
  header { padding: 15px; } header p { font-size: 20px; }
  .writing-panel { left: 12px; right: 12px; bottom: 12px; padding: 14px; }
}
</style>
