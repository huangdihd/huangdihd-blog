import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: "Huangdihd 的博客",
  description: "个人博客与作品集",
  markdown: {
    math: true
  },
  themeConfig: {
    logo: '/avatar.jpeg',
    nav: [
      { text: '首页', link: '/' },
      { text: '数据结构与算法', link: '/dsa/' },
      { text: '机器学习算法', link: '/ml/' },
      { text: '人工智能应用', link: '/ai/' },
      { text: '个人项目', link: '/projects/' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/dsa/': [
        {
          text: '数据结构与算法',
          items: [
            { text: '引言', link: '/dsa/' },
            { text: '数组基础', link: '/dsa/array-basics' }
          ]
        }
      ],
      '/ml/': [
        {
          text: '机器学习基础',
          items: [
            { text: '引言', link: '/ml/' }
          ]
        },
        {
          text: '有监督学习',
          collapsed: false,
          items: [
            { text: '概览', link: '/ml/supervised/' },
            { text: '基本概念', link: '/ml/supervised/what-is' },
            { text: '梯度下降', link: '/ml/supervised/gradient-descent' },
            { text: '反向传播', link: '/ml/supervised/backpropagation' }
          ]
        },
        {
          text: '无监督学习',
          collapsed: false,
          items: [
            { text: '概览', link: '/ml/unsupervised/' },
            { text: '基本概念', link: '/ml/unsupervised/what-is' }
          ]
        }
      ],
      '/ai/': [
        {
          text: '人工智能应用',
          items: [
            { text: '引言', link: '/ai/' }
          ]
        }
      ],
      '/projects/': [
        {
          text: '个人项目',
          items: [
            { text: '项目概览', link: '/projects/' }
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