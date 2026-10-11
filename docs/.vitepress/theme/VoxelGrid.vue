<script setup>
// 3×9 体素格，来自 CLMCP 项目；深浅按固定图案排列，保证每次渲染一致
const ROWS = 3
const COLS = 9
const PATTERN = [
  2, 1, 0, 1, 2, 2, 1, 0, 1,
  1, 2, 1, 0, 1, 2, 2, 1, 0,
  0, 1, 2, 1, 0, 1, 2, 2, 1
]
const cells = PATTERN.map((shade, i) => ({
  shade,
  delay: `${((i % COLS) + Math.floor(i / COLS)) * 0.12}s`
}))
</script>

<template>
  <div class="voxel-grid" :style="{ '--cols': COLS, '--rows': ROWS }" aria-hidden="true">
    <span
      v-for="(cell, i) in cells"
      :key="i"
      :class="['voxel', `shade-${cell.shade}`]"
      :style="{ animationDelay: cell.delay }"
    />
  </div>
</template>

<style scoped>
.voxel-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 10px);
  grid-template-rows: repeat(var(--rows), 10px);
  gap: 2px;
  width: max-content;
}

.voxel {
  display: block;
  animation: voxel-wave 3.6s ease-in-out infinite;
}

.shade-0 { background: var(--vp-c-border); }
.shade-1 { background: var(--vp-c-brand-3); }
.shade-2 { background: var(--vp-c-brand-1); }

@keyframes voxel-wave {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .voxel { animation: none; }
}
</style>
