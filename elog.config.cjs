/**
 * Elog 配置：Notion → 本地 Markdown
 * 文档：https://elog.1874.cool/
 *
 * 用 .cjs 后缀的原因：项目 package.json 是 "type": "module"，
 * 而 Elog 用 require() 加载配置，.js 会被当成 ESM，导致 config.write 读不到。
 */
module.exports = {
  write: {
    platform: 'notion',
    notion: {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID,
      // 默认不过滤。想只拉已发布的，把下面这行换成：
      // filter: { property: 'Published', checkbox: { equals: true } },
      filter: false,
      sorts: false,
      catalog: false,
      // 并发下载文档数，Notion 限流 3 req/s，保守一点
      limit: 3,
    },
  },

  deploy: {
    platform: 'local',
    local: {
      outputDir: './src/posts',
      // title：用标题当文件名；urlname：用 Notion 里的 urlname 字段（需在数据库里建该字段）
      filename: 'title',
      format: 'markdown',
      catalog: false,
      frontMatter: {
        enable: true,
      },
    },
  },

  image: {
    enable: true,
    platform: 'local',
    local: {
      outputDir: './public/notion-assets',
      prefixKey: '/notion-assets',
      pathFollowDoc: false,
    },
  },
};
