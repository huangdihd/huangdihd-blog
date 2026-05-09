import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Huangdihd's Blog",
  description: "A personal blog and portfolio",
  themeConfig: {
    logo: '/avatar.jpeg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Blog', link: '/posts/first-post' },
      { text: 'About', link: '/about' }
    ],
    sidebar: {
      '/posts/': [
        {
          text: 'Blog Posts',
          items: [
            { text: 'My First Post', link: '/posts/first-post' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/huangdihd' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Huangdihd'
    }
  }
})