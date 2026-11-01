// 相册数据（首页照片墙 + /photowall 页面读取这里）
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = [
  {
    id: 'pjskt-cards',
    title: '卡面收藏',
    description: '这个部分又该叫什么啊',
    cover: '/images/opt/wall-02.webp',
    date: '2026.10',
    photos: [
      { url: '/images/opt/wall-01.webp', caption: '3rd Anniversary' },
      { url: '/images/opt/wall-02.webp', caption: 'card_1039' },
      { url: '/images/opt/wall-03.webp', caption: 'card_1040' },
      { url: '/images/opt/wall-04.webp', caption: 'card_1041' },
      { url: '/images/opt/wall-05.webp', caption: 'card_1042' },
      { url: '/images/opt/wall-06.webp', caption: 'card_1162' },
      { url: '/images/opt/wall-07.webp', caption: 'card_1163' },
      { url: '/images/opt/wall-08.webp', caption: 'card_1195' },
      { url: '/images/opt/wall-09.webp', caption: 'card_564' },
      { url: '/images/opt/wall-10.webp', caption: 'card_617' },
      { url: '/images/opt/wall-11.webp', caption: 'card_638' },
      { url: '/images/opt/wall-12.webp', caption: 'card_844' },
      { url: '/images/opt/wall-13.webp', caption: 'card_944' },
    ],
  },
];
