import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import ProjectCard from './ProjectCard.vue'
import VoxelGrid from './VoxelGrid.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ProjectCard', ProjectCard)
    app.component('VoxelGrid', VoxelGrid)
  }
}
