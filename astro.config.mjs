import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import path from 'node:path';

// 核心思路：用 Vite 别名把 Next.js 专属模块劫持到本地垫片，
// 这样原项目的 components/ 可以"零改动"照搬进 Astro。
export default defineConfig({
  site: 'https://example.com',
  integrations: [react()],
  // 首页/文章页仍然是预渲染的静态页；只有 /api/music 走按需渲染
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'next/link': path.resolve('./src/lib/next-link.tsx'),
        'next/navigation': path.resolve('./src/lib/next-navigation.ts'),
        'next/server': path.resolve('./src/lib/next-server.ts'),
        '@': path.resolve('./src'),
      },
    },
  },
});
