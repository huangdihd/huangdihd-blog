<script setup>
import { withBase } from 'vitepress'
import { data as essays } from './essays.data.mjs'
import LinSignature from './LinSignature.vue'
import SnowField from './SnowField.vue'
import VoxelGrid from './VoxelGrid.vue'

const sections = [
  { title: '个人项目', link: '/projects/', desc: '开源作品集，与日常捣鼓的小玩意。', voxel: true },
  { title: '随笔', link: '/essays/', desc: '生活、观察与思考的记录。', count: `${essays.length} 篇` },
  { title: '机器学习算法', link: '/ml/', desc: '机器学习背后的数学原理与模型推导。' },
  { title: '人工智能应用', link: '/ai/', desc: '开发或参与的人工智能实践。' },
  { title: '数据结构与算法', link: '/dsa/', desc: '对经典数据结构与算法的理解。' },
  { title: '关于', link: '/about', desc: '我是谁，以及这个地方为什么存在。' }
]

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
  <div class="aling-home">
    <section class="hero">
      <SnowField />
      <div class="container hero-grid">
        <div class="intro">
          <p class="eyebrow">Huangdihd · 北京</p>
          <h1 class="name">Huangdihd</h1>
          <p class="motto">All I need, knowledge and <span class="warm">love</span>.</p>
          <span class="rule" />
          <p class="lede">
            国际学校的高中生，喜欢计算机科学、物理与数学。这里记录学习心得、技术见解，以及一些关于生活的随笔。
          </p>
          <nav class="quick">
            <a :href="withBase('/projects/')">个人项目</a>
            <a :href="withBase('/essays/')">随笔</a>
            <a :href="withBase('/about')">关于我</a>
          </nav>
        </div>

        <figure class="portrait">
          <div class="frame">
            <img :src="withBase('/avatar.jpeg')" alt="Huangdihd 的头像" width="320" height="320" />
          </div>
          <figcaption>
            <span class="caption">Fig. 01 — 凛冬</span>
            <LinSignature class="signature" :height="34" />
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="container block">
      <header class="block-head">
        <span class="label">目录</span>
        <span class="label en">Index</span>
      </header>
      <a
        v-for="(item, i) in sections"
        :key="item.link"
        class="row"
        :href="withBase(item.link)"
        :style="{ animationDelay: `${0.5 + i * 0.07}s` }"
      >
        <span class="row-num">{{ pad(i + 1) }}</span>
        <span class="row-title">{{ item.title }}</span>
        <span class="row-desc">{{ item.desc }}</span>
        <span class="row-extra">
          <VoxelGrid v-if="item.voxel" />
          <span v-else-if="item.count" class="row-count">{{ item.count }}</span>
        </span>
        <span class="row-arrow" aria-hidden="true">→</span>
      </a>
    </section>

    <section v-if="essays.length" class="container block">
      <header class="block-head">
        <span class="label">随笔</span>
        <span class="label en">Essays</span>
      </header>
      <div class="essays">
        <a v-for="(essay, i) in essays" :key="essay.url" class="essay" :href="withBase(essay.url)">
          <span class="essay-num">No. {{ pad(i + 1) }}</span>
          <span class="essay-title">{{ essay.title }}</span>
          <span class="essay-desc">{{ essay.description }}</span>
          <span class="essay-more">阅读 →</span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (min-width: 640px) {
  .container { padding: 0 48px; }
}

@media (min-width: 960px) {
  .container { padding: 0 64px; }
}

/* ---------- 首屏 ---------- */
.hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--vp-c-divider);
  background-image:
    radial-gradient(rgba(238, 238, 241, 0.16) 1px, transparent 1.4px),
    radial-gradient(rgba(238, 238, 241, 0.08) 1px, transparent 1.4px);
  background-size: 37px 41px, 23px 29px;
  animation: snow 48s linear infinite;
}

:root:not(.dark) .hero {
  background-image:
    radial-gradient(rgba(28, 29, 34, 0.10) 1px, transparent 1.4px),
    radial-gradient(rgba(28, 29, 34, 0.05) 1px, transparent 1.4px);
}

/* 位移取两层图案尺寸的整数倍，循环无缝 */
@keyframes snow {
  from { background-position: 0 0, 11px 7px; }
  to { background-position: 37px 410px, -12px 297px; }
}

.hero-grid {
  position: relative;
  display: grid;
  gap: 56px;
  padding-top: 64px;
  padding-bottom: 72px;
}

@media (min-width: 960px) {
  .hero-grid {
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: end;
    gap: 96px;
    padding-top: 112px;
    padding-bottom: 104px;
  }
}

.intro > * {
  animation: rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.intro > :nth-child(2) { animation-delay: 0.08s; }
.intro > :nth-child(3) { animation-delay: 0.16s; }
.intro > :nth-child(4) { animation-delay: 0.24s; }
.intro > :nth-child(5) { animation-delay: 0.32s; }
.intro > :nth-child(6) { animation-delay: 0.4s; }

.eyebrow {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.name {
  margin-top: 20px;
  font-family: var(--aling-serif);
  font-size: clamp(48px, 7vw, 88px);
  white-space: nowrap;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.motto {
  margin-top: 24px;
  font-family: var(--aling-serif);
  font-size: clamp(20px, 2.4vw, 26px);
  font-style: italic;
  color: var(--vp-c-text-2);
}

.rule {
  display: block;
  width: 48px;
  height: 1px;
  margin: 36px 0 28px;
  background: var(--vp-c-brand-1);
}

.lede {
  max-width: 30em;
  font-size: 15px;
  line-height: 1.85;
  color: var(--vp-c-text-2);
}

.quick {
  display: flex;
  flex-wrap: wrap;
  margin-top: 36px;
  border-left: 1px solid var(--vp-c-border);
}

.quick a {
  padding: 10px 20px;
  border: 1px solid var(--vp-c-border);
  border-left: none;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  transition: color 0.25s, background-color 0.25s;
}

.quick a:first-child {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

.quick a:hover { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.quick a:first-child:hover { color: var(--vp-c-bg); background: var(--vp-c-brand-2); }

/* 画框 + 图注 + 落款 */
.portrait {
  justify-self: center;
  width: min(100%, 340px);
  animation: rise 1s cubic-bezier(0.2, 0.7, 0.2, 1) 0.2s both;
}

.frame {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-elv);
  transition: border-color 0.4s;
}

.frame:hover { border-color: var(--vp-c-brand-1); }

.frame img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}

.portrait figcaption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.caption {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

/* ---------- 区块 ---------- */
.block { margin-top: 88px; }

.block-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vp-c-text-1);
}

.label {
  font-family: var(--aling-serif);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--vp-c-text-1);
}

.label.en {
  margin-left: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 400;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

/* 目录行 */
.row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 24px;
  align-items: baseline;
  column-gap: 16px;
  row-gap: 6px;
  padding: 22px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  animation: rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  transition: background-color 0.3s;
}

.row-num {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
  transition: color 0.3s;
}

.row-title {
  font-family: var(--aling-serif);
  font-size: 20px;
  font-weight: 600;
  transition: color 0.3s, transform 0.3s;
}

.row-desc {
  grid-column: 2;
  grid-row: 2;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.row-extra { display: none; }

.row-arrow {
  grid-column: 3;
  grid-row: 1;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  transition: color 0.3s, transform 0.3s;
}

@media (min-width: 768px) {
  .row {
    grid-template-columns: 56px 200px minmax(0, 1fr) 120px 32px;
    align-items: center;
    padding: 26px 0;
  }

  .row-desc { grid-column: auto; grid-row: auto; }
  .row-arrow { grid-column: auto; grid-row: auto; text-align: right; }

  .row-extra {
    display: flex;
    justify-content: flex-end;
  }
}

.row-count {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.row:hover { background: var(--vp-c-brand-soft); }
.row:hover .row-num,
.row:hover .row-title,
.row:hover .row-arrow { color: var(--vp-c-brand-1); }
.row:hover .row-title { transform: translateX(6px); }
.row:hover .row-arrow { transform: translateX(-6px); }

/* 随笔：1px 拼接线框 */
.essays {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1px;
  margin-top: 32px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-divider);
}

.essay {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: background-color 0.3s;
}

.essay-num {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.essay-title {
  font-family: var(--aling-serif);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
}

.essay-desc {
  flex: 1;
  font-size: 14px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.essay-more {
  margin-top: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
  transition: color 0.3s;
}

.essay:hover { background: var(--vp-c-bg-alt); }
.essay:hover .essay-more { color: var(--vp-c-brand-1); }

@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .intro > *,
  .portrait,
  .row { animation: none; }
}
</style>
