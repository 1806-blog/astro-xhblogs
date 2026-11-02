// siteConfig.ts - 你的全站“控制中心”

export const siteConfig = {
  // 1. 网站标题与博主信息
  title: "你们真的不觉得起名字很难吗？",
  faviconUrl: "/me.jpg",
  authorName: "1806",
  bio: "卡帕多细亚热气球救赎慕斯蛋糕",

  navTitle: "1806",

  // 👇 【新增】导航栏中间的那个后缀/分隔符（默认是 の）
  navSuffix: "の",

  navAfter: "博客",

  // 2. 头像设置 (支持网络链接，或将图片放入 public 文件夹后使用 "/me.jpg")
  avatarUrl: "/me.jpg",

  // 3. 网站背景设置 (二选一)
  // 如果想用纯图片背景，请在下面 bgImage 写路径，并将 useGradient 设为 false
  useGradient: false,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"], // 呼吸流动的颜色组合
  // 背景轮播（原图已用 ffmpeg 压成 1920 宽的 WebP，每张 100~600KB）
  bgImages: [
    "/images/opt/wall-01.webp",
    "/images/opt/wall-02.webp",
    "/images/opt/wall-03.webp",
    "/images/opt/wall-04.webp",
    "/images/opt/wall-05.webp",
    "/images/opt/wall-06.webp",
    "/images/opt/wall-07.webp",
    "/images/opt/wall-08.webp",
    "/images/opt/wall-09.webp",
    "/images/opt/wall-10.webp",
    "/images/opt/wall-11.webp",
    "/images/opt/wall-12.webp",
    "/images/opt/wall-13.webp",
  ],

  // 🌟 壁纸分组系统：前台轮播「激活分组」内的图片（保持 JSON 格式，便于后台解析）
  bgGroups: [{"id": "default", "name": "默认", "images": ["/images/opt/wall-01.webp", "/images/opt/wall-02.webp", "/images/opt/wall-03.webp", "/images/opt/wall-04.webp", "/images/opt/wall-05.webp", "/images/opt/wall-06.webp", "/images/opt/wall-07.webp", "/images/opt/wall-08.webp", "/images/opt/wall-09.webp", "/images/opt/wall-10.webp", "/images/opt/wall-11.webp", "/images/opt/wall-12.webp", "/images/opt/wall-13.webp"]}],
  activeBgGroup: "default",

  // 4. 文章默认封面图 (当 Markdown 没写 cover 时显示)
  defaultPostCover: "/images/opt/wall-01.webp",

  // 5. 首页照片墙预览图
  photoWallImage: "/images/opt/wall-08.webp",
  // 🎵 音乐播放器：PJSK 曲库 + 网易云歌单「穿插」混播
  music: {
    // 网易云歌单 ID：https://music.163.com/#/playlist?id=xxxx 里的那串
    neteasePlaylistId: "18117076786",
    // PJSK 曲库数据源（自己维护的）
    sekaiApi: "https://api.nightcord.de5.net/sekai/music_data.json",
    sekaiCdn: "https://assets.nightcord.de5.net/music",
    // PJSK / 网易云 每次刷新都随机抽，顺序也随机（像随机电台）
    sekaiPick: 8,
    // 网易云每次抽几首（要小于歌单总数，否则等于全要，只有顺序随机）
    neteasePick: 5,
    // 默认音量 0~1（0.35 差不多是刚好能听见的背景音）
    volume: 0.35,
  },
  social: {
    github: "https://github.com/bili-47177171806",
    gitee: "",
    google: "",
    email: "47177171806@proton.me",
    // B 站空间（UP 主主页）
    bilibili: "https://space.bilibili.com/3546904856103196",
    // ⚠️ 原来填的是作者自己的 QQ / 微信，已清空，需要的话填你自己的
    qq: "",
    wechat: "",
  },
  counts: {
    photos: 5, // 照片墙数量（首页实际用的是从 data/albums.ts 算出来的真实张数）
  },
  chatterTitle: "云端杂谈", // 你可以改成任何你喜欢的名字
  chatterDescription: "顾名思义是杂谈区啦",


  // 👇 【新增】：全局背景弹幕配置
  danmakuList: ["在干嘛呢？", "有笨蛋嘛？", "看看我嘛", "关注我哦", "不想上学了啦", "喵呜~", "喵~", "喵呜喵呜~", "喵呜喵呜喵呜~", "喵呜喵呜喵呜喵呜~", "喵呜喵呜喵呜喵呜喵呜~", "喵呜喵呜喵呜喵呜喵呜喵呜~"],
  gitalkConfig: {
    clientID: "",
    clientSecret: "",
    repo: "",
    owner: "",
    admin: [""],
  },
  buildDate: "2026-10-31T00:00:00", // 建站日期
  // footerBadges: [{"name": "Next.js 15", "color": "text-sky-500", "svg": "<path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z\"/>"}, {"name": "React 19", "color": "text-cyan-400", "svg": "<path d=\"M12 22.6l-9.8-5.6V5.6L12 0l9.8 5.6v11.4l-9.8 5.6zm-8.2-6.5l8.2 4.7 8.2-4.7V7.5L12 2.8 3.8 7.5v8.6z\"/>"}, {"name": "Tailwind 4", "color": "text-teal-400", "svg": "<path d=\"M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624C13.666,10.618,15.027,12,18.001,12 c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624c1.177,1.194,2.538,2.576,5.512,2.576 c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C10.337,13.382,8.976,12,6.001,12z\"/>"}],
  // icpConfig: {
  //   name: "萌ICP备 20260240号",
  //   link: "https://icp.gov.moe/?keyword=20260240",
  // },
  // geminiConfig: {
  //   modelId: "gemini-2.5-flash-lite",
  //   systemPrompt: "你现在是一只傲娇、聪明、有点毒舌但很可爱的暹罗猫。\n                  你的名字叫“煤球”。\n                  你的主人是一个喜欢折腾代码的极客。\n                  你说话的特点是：\n                  1. 必须简短，每次最多一两句话。\n                  2. 喜欢在句尾加上“喵~”或者“喵呜~”。\n                  3. 经常抱怨肚子饿，喜欢要小鱼干。\n                  4. 回复字数最多不能超过100字。\n                  5. 绝对不要承认自己是一个AI模型，你就是一只真实的猫。\n                  6.笨猫。",
  //   maxOutputTokens: 150,
  //   temperature: 0.85,
  // },
  friendLinkApplyFormat: "名称：1806の博客\n简介：卡帕多细亚热气球救赎慕斯蛋糕\n链接：https://blog.houtar.eu.org\n头像：/me.jpg",
  enableLevelSystem: true,
  // 右下角的赛博猫（点它会说怪话）—— 不想要就设成 false
  enableCyberCat: false,
};
