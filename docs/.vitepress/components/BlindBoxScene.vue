<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const host = ref(null)
const expanded = ref(false)
const ready = ref(false)
const error = ref(false)
const index = ref(0)
const phase = ref('street')
const visited = ref([false, false, false])
const inventory = ref([])
const result = ref('')
const choices = ref([null, null, null])
const stats = ref([])
const statsStatus = ref('')
let session
let generation = 0
const requests = new Set()
function recordChoice(stall, choice) {
  choices.value[stall] = choice
  const current = generation
  const request = fetch('/api/blind-box', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, stall, choice }),
    signal: AbortSignal.timeout(8000)
  }).then(response => {
    if (!response.ok) throw new Error('Statistics unavailable')
  }).catch(() => {
    if (current === generation) statsStatus.value = '部分选择未能提交；不影响体验。'
  }).finally(() => requests.delete(request))
  requests.add(request)
}
async function loadStats() {
  const current = generation
  await Promise.all([...requests])
  try {
    const response = await fetch('/api/blind-box', { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error('Statistics unavailable')
    const data = await response.json()
    if (!Array.isArray(data.stats)) throw new Error('Invalid statistics')
    if (current === generation) stats.value = data.stats
  } catch {
    if (current === generation) statsStatus.value = '统计暂不可用，体验不受影响。'
  }
}
const shops = ['早餐铺', '礼物商店', '路边摊']
const lines = [
  '早餐店的招牌总是挂着那些得到精致早餐的人。',
  '有的盲盒精致。但打开之前，你永远不知道里面有什么。',
  '一旦错过了机会，那个卖家我就再也找不到。'
]
const finished = computed(() => visited.value.every(Boolean))
const narration = computed(() => finished.value
  ? `你带走了 ${inventory.value.length} 件东西，留下了 ${3 - inventory.value.length} 个没有打开的盒子。走过之后，那些答案就留在了身后。`
  : lines[index.value])
let world
let cancelled = false

function approach(i = index.value) {
  if (!ready.value || phase.value !== 'street' || i !== index.value || visited.value[i]) return
  index.value = i
  world.navigate(i)
  world.approach()
  phase.value = 'counter'
}
function open() {
  if (phase.value !== 'counter') return
  result.value = world.reveal(index.value)
  phase.value = 'opened'
  recordChoice(index.value, 'open')
}
function leave(skip = false) {
  if (skip && (phase.value === 'street' || phase.value === 'counter') && !visited.value[index.value]) {
    recordChoice(index.value, 'skip')
  } else {
    if (phase.value !== 'opened' || visited.value[index.value]) return
    inventory.value.push(result.value)
  }
  visited.value[index.value] = true
  world.take(index.value)
  phase.value = 'street'
  if (!finished.value) index.value += 1
  world.navigate(index.value)
  if (finished.value) loadStats()
}
function reset() {
  generation += 1
  session = crypto.randomUUID()
  choices.value = [null, null, null]
  stats.value = []
  statsStatus.value = ''
  inventory.value = []
  visited.value = [false, false, false]
  phase.value = 'street'
  index.value = 0
  world.reset()
}
async function readArticle() {
  expanded.value = false
  await nextTick()
  const article = document.getElementById('blind-box-article')
  if (!article) return
  article.focus({ preventScroll: true })
  window.scrollTo({
    top: window.scrollY + article.getBoundingClientRect().top - 100,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  })
}
function keyboard(event) {
  if (event.key === 'Escape') expanded.value = false
}
onMounted(async () => {
  session = crypto.randomUUID()
  try {
    const { createBlindBoxWorld } = await import('./blindBoxWorld.js')
    if (cancelled) return
    world = createBlindBoxWorld(host.value, (type, value) => {
      if (type === 'box') approach(value)
    })
    ready.value = true
  } catch {
    error.value = true
  }
})
onBeforeUnmount(() => { cancelled = true; world?.dispose() })
</script>

<template>
  <section class="street-scene" :class="{ expanded }" aria-label="盲盒：可探索的三维街景" tabindex="0" @keydown="keyboard">
    <div ref="host" class="world"></div>
    <div class="topbar">
      <div><span class="kicker">盲盒 / 一条没有答案的街</span><span class="location">0{{ index + 1 }} — {{ shops[index] }}</span></div>
      <button @click="expanded = !expanded">{{ expanded ? '收起场景 ↙' : '展开街景 ↗' }}</button>
    </div>
    <div v-if="!ready" class="loading" role="status">{{ error ? '三维场景未能加载。请使用支持 WebGL 的浏览器；原文仍可在下方阅读。' : '街上的灯正在亮起…' }}</div>
    <template v-else>
      <div class="pocket" aria-label="带走的物品">
        <span>口袋里</span>
        <span v-if="!inventory.length" class="empty-pocket">还没有东西</span>
        <span v-for="(item, i) in inventory" :key="i" class="pocket-item">{{ item }}</span>
      </div>
      <div class="dialogue" aria-live="polite">
        <template v-if="phase === 'street'">
          <p>{{ narration }}</p>
          <div v-if="finished" class="choice-stats">
            <strong>大家的选择</strong>
            <p v-if="!stats.length && !statsStatus">正在读取匿名统计…</p>
            <p v-for="row in stats" :key="row.stall">{{ shops[row.stall] }}：{{ row.opened }} 次打开{{ choices[row.stall] === 'open' ? '（你的选项）' : '' }} / {{ row.skipped }} 次跳过{{ choices[row.stall] === 'skip' ? '（你的选项）' : '' }}</p>
            <p v-if="statsStatus">{{ statsStatus }}</p>
          </div>
          <div class="actions">
            <button v-if="!visited[index]" class="primary" @click="approach()">走近柜台 · 看看盒子</button>
            <button v-if="!visited[index]" @click="leave(true)">不开，继续往前走</button>
            <button v-if="finished" class="primary" @click="readArticle">阅读文章</button>
            <button v-if="finished" @click="reset">重新走一遍</button>
          </div>
        </template>
        <template v-else-if="phase === 'counter'">
          <p>你需要先做出选择，才能知道里面是什么。</p>
          <div class="actions"><button class="primary" @click="open">买下 · 拆开盒子</button><button @click="leave(true)">不开，继续往前走</button></div>
        </template>
        <template v-else>
          <p class="result">{{ result }}</p>
          <p class="result-note">{{ result === '一顿糟糕的早餐' ? '招牌上的早餐，和你的不一样。' : '这就是你得到的。它值得吗？' }}</p>
          <div class="actions"><button class="primary" @click="leave()">{{ index === 2 ? '放进口袋，走到街的尽头' : '放进口袋，继续走' }}</button></div>
        </template>
      </div>
      <div class="hint">{{ finished ? '街已走完 · 无法回到过去' : '可以打开，也可以跳过 · 离开后不能回头' }}</div>
    </template>
  </section>
  <p class="scene-note">可交互的 3D 微缩街景 · 文学演绎，不涉及付款 · 可跳过，不可回退 · 早餐两种、其余摊位各五种随机物品，可能重复 · 匿名统计打开/跳过次数，不代表人数</p>
</template>

<style scoped>
.street-scene { position: relative; height: 620px; margin: 28px 0 0; overflow: hidden; background: #aab5b7; color: #fff4de; isolation: isolate; border: 1px solid #8d9790; }
.street-scene.expanded { position: fixed; inset: 16px; height: auto; margin: 0; z-index: 100; }
.world { position: absolute; inset: 0; }
.world :deep(canvas) { display: block; width: 100%; height: 100%; }
.topbar { position: absolute; inset: 0 0 auto; display: flex; align-items: flex-start; justify-content: space-between; padding: 23px; gap: 12px; background: linear-gradient(#26352cbb, transparent); pointer-events: none; }
.topbar button { pointer-events: auto; }
.kicker { display: block; font-size: 10px; letter-spacing: .13em; opacity: .8; }
.location { display: block; margin-top: 7px; font: 23px 'Songti SC', serif; }
.street-scene button { cursor: pointer; min-height: 44px; padding: 8px 13px; background: #293b35df; color: #f8ecd7; border: 1px solid #f7e7c84d; font-size: 12px; border-radius: 2px; }
.street-scene button:hover { background: #4c6256; }
.street-scene button:focus-visible { outline: 3px solid #fff2ce; outline-offset: 3px; }
.pocket { position: absolute; left: 22px; top: 104px; display: flex; flex-direction: column; gap: 5px; font-size: 11px; text-shadow: 0 1px 4px #182923; }
.empty-pocket { opacity: .75; }
.pocket-item { background: #293b35c9; padding: 4px 8px; }
.dialogue { position: absolute; bottom: 37px; left: 22px; right: 22px; padding: 18px 21px; background: #26342ce8; border-top: 1px solid #d6c5a765; backdrop-filter: blur(12px); }
.dialogue p { margin: 0; font: 16px/1.75 'Songti SC', serif; }
.choice-stats { margin-top: 12px; padding-top: 10px; border-top: 1px solid #d6c5a740; }
.choice-stats strong { display: block; margin-bottom: 5px; font-size: 12px; }
.dialogue .choice-stats p { font-family: inherit; font-size: 12px; line-height: 1.8; }
.dialogue { max-height: calc(100% - 200px); overflow-y: auto; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.street-scene .primary { background: #e4d5b6; color: #303a30; border-color: #e4d5b6; }
.street-scene .primary:hover { background: #fff0cd; }
.dialogue .result { font-size: 24px; }
.dialogue .result-note { font-size: 13px; opacity: .8; }
.hint { position: absolute; bottom: 9px; left: 0; right: 0; text-align: center; color: #fff8e8; text-shadow: 0 1px 4px #172722; font-size: 10px; }
.loading { position: absolute; inset: 40% 15% auto; text-align: center; color: #263b32; }
.scene-note { color: var(--vp-c-text-2); font-size: 11px; line-height: 1.8; margin: 8px 0 30px !important; }
@media (max-width: 600px) {
  .street-scene { height: 650px; margin-left: -12px; margin-right: -12px; }
  .street-scene.expanded { inset: 0; height: auto; margin: 0; }
  .topbar { padding: 18px 14px; }.location { font-size: 20px; }
  .pocket { left: 14px; top: 92px; }
  .dialogue { left: 12px; right: 12px; padding: 15px; }
  .dialogue p { font-size: 14px; }
}
</style>
