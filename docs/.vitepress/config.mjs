import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: "Huangdihd 的博客",
  description: "个人博客与作品集",
  lastUpdated: true,
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
            { text: '反向传播', link: '/ml/supervised/backpropagation' },
            { text: '卷积', link: '/ml/supervised/convolution' }
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
            { text: '项目概览', link: '/projects/' },
            { text: 'Xinbot 开发记录', link: '/projects/xinbot' }
          ]
        },
        {
          text: '编程入门指南',
          items: [
            { text: '如何开始你的第一个编程项目', link: '/projects/first-project' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/huangdihd' },
      { icon: { svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Telegram</title><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' }, link: 'https://t.me/huangdihd_personal' }
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