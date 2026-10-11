<script setup>
import { withBase } from 'vitepress'
import VoxelGrid from './VoxelGrid.vue'

defineProps({
  title: { type: String, required: true },
  link: { type: String, required: true },
  desc: { type: String, default: '' }
})
</script>

<template>
  <a class="project-card" :href="withBase(link)">
    <VoxelGrid />
    <span class="title">{{ title }}</span>
    <span v-if="desc" class="desc">{{ desc }}</span>
  </a>
</template>

<style scoped>
.vp-doc a.project-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
  padding: 20px 24px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  transition: border-color 0.25s;
}

.vp-doc a.project-card:hover {
  border-color: var(--vp-c-brand-1);
}

.title {
  font-family: var(--aling-serif);
  font-size: 18px;
  font-weight: 600;
}

.desc {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}
</style>
