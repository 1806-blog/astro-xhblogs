/**
 * Elog 配置：Notion → src/posts（文章）
 *
 * 和 elog.chatters.cjs 共用同一个 Notion 数据库，
 * 靠库里的 `type` 列（select）区分：选「文章」的进这里，选「杂谈」进另一份配置。
 */
module.exports = {
  write: {
    platform: 'notion',
    notion: {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID,
      // 只拉 type = 文章 的
      filter: { property: 'type', select: { equals: '文章' } },
      sorts: false,
      catalog: false,
      limit: 3,
    },
  },

  deploy: {
    platform: 'local',
    local: {
      outputDir: './src/posts',
      filename: 'title',
      format: 'markdown',
      catalog: false,
      frontMatter: { enable: true },
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
