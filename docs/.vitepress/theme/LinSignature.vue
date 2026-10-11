<script setup>
defineProps({
  height: { type: Number, default: 56 }
})
</script>

<template>
  <svg
    class="lin-signature"
    :width="height * 2"
    :height="height"
    viewBox="0 0 200 100"
    role="img"
    aria-label="阿凛"
  >
    <text x="100" y="80" text-anchor="middle">阿凛</text>
  </svg>
</template>

<style scoped>
.lin-signature {
  display: block;
  overflow: visible;
}

/* 先沿笔画描出轮廓，再让墨色落下 */
.lin-signature text {
  font-family: 'Long Cang', var(--aling-serif);
  font-size: 88px;
  fill: var(--vp-c-brand-1);
  fill-opacity: 0;
  stroke: var(--vp-c-brand-1);
  stroke-width: 1;
  stroke-dasharray: 360;
  stroke-dashoffset: 360;
  animation:
    lin-draw 3.2s cubic-bezier(0.65, 0, 0.35, 1) 0.6s forwards,
    lin-ink 1.2s ease-out 3.4s forwards;
}

@keyframes lin-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes lin-ink {
  to { fill-opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .lin-signature text {
    animation: none;
    stroke-dashoffset: 0;
    fill-opacity: 1;
  }
}
</style>
