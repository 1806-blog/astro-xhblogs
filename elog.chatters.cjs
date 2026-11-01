/**
 * Elog 配置：Notion → src/chatters（杂谈）
 *
 * 同一个数据库，只拉 type = 杂谈 的那些。
 * 杂谈页会读 `mood` 字段，所以库里建议再加一列 mood（select 或 rich_text）。
 */
module.exports = {
  write: {
    platform: 'notion',
    notion: {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID,
      filter: { property: 'type', select: { equals: '杂谈' } },
      sorts: false,
      catalog: false,
      limit: 3,
    },
  },

  deploy: {
    platform: 'local',
    local: {
      outputDir: './src/chatters',
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
