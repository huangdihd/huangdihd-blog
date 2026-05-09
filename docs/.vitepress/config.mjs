import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: "Huangdihd 的博客",
  description: "个人博客与作品集",
  themeConfig: {
    logo: '/avatar.jpeg',
    nav: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/posts/first-post' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/posts/': [
        {
          text: '博客文章',
          items: [
            { text: '我的第一篇文章', link: '/posts/first-post' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/huangdihd' }
    ],
    footer: {
      message: '基于 MIT 许可发布。',
      copyright: '版权所有 © 2026-present Huangdihd'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    outline: {
      label: '页面导航'
    },
    lastUpdated: {
      text: '最后更新于'
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})