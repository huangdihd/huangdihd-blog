<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import LinSignature from './LinSignature.vue'

const { page } = useData()

// 签名只落在随笔正文和关于页
const signed = computed(() => {
  const path = page.value.relativePath
  return path === 'about.md' || (path.startsWith('essays/') && path !== 'essays/index.md')
})
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-footer-before>
      <LinSignature v-if="signed" class="doc-signature" :height="44" />
    </template>
  </DefaultTheme.Layout>
</template>
