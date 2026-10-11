<script setup>
import { useId } from 'vue'
import { signature } from './signature.mjs'

// 「阿凛」手写签名：按原本的笔顺与节奏一笔一笔写出来
const props = defineProps({
  height: { type: Number, default: 40 },
  delay: { type: Number, default: 0.5 } // 开始书写前的等待（秒）
})

const uid = useId()
</script>

<template>
  <svg
    class="lin-signature"
    :width="Math.round(props.height * signature.aspect)"
    :height="props.height"
    :viewBox="signature.viewBox"
    role="img"
    aria-label="阿凛"
  >
    <defs>
      <mask
        v-for="(s, i) in signature.strokes"
        :id="`${uid}-m${i}`"
        :key="i"
        maskUnits="userSpaceOnUse"
        :x="signature.box.x"
        :y="signature.box.y"
        :width="signature.box.width"
        :height="signature.box.height"
      >
        <path
          class="reveal"
          :d="s.center"
          :stroke-width="s.reveal"
          pathLength="1"
          :style="{ animationDelay: `${props.delay + Number(s.delay)}s`, animationDuration: `${s.duration}s` }"
        />
      </mask>
    </defs>
    <path
      v-for="(s, i) in signature.strokes"
      :key="i"
      class="ink"
      :d="s.outline"
      :mask="`url(#${uid}-m${i})`"
    />
  </svg>
</template>

<style scoped>
.lin-signature {
  display: block;
  overflow: visible;
}

.ink { fill: var(--vp-c-brand-1); }

/* 中线遮罩从起笔处展开到收笔处 */
.reveal {
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1 2;
  stroke-dashoffset: 1.01;
  animation-name: lin-write;
  animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  animation-fill-mode: forwards;
}

@keyframes lin-write {
  to { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
