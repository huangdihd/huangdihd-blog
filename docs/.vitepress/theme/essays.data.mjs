import { createContentLoader } from 'vitepress'

// 首页「随笔」区块：读取 essays 下的文章标题与摘要
export default createContentLoader('essays/*.md', {
  transform(pages) {
    return pages
      .filter((page) => !page.url.endsWith('/essays/'))
      .map((page) => ({
        url: page.url,
        title: page.frontmatter.title,
        description: page.frontmatter.description ?? '',
        date: page.frontmatter.date ? String(page.frontmatter.date) : ''
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url))
  }
})
