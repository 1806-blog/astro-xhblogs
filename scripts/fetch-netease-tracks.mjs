#!/usr/bin/env node
/**
 * 一次性（或按需）把网易云歌单的完整曲目列表拉下来，存成静态 JSON。
 *
 * 为什么要有这一步：这个歌单要登录态才看得到全部曲目（匿名只给 10 首）。
 * 但我们不想让线上带着账号 Cookie 跑，所以：
 *   本地跑一次（带 Cookie）→ 生成 src/data/neteaseTracks.json → 提交
 *   线上只读这个 JSON，完全不碰凭证。
 *
 * 用法（Cookie 只在本地环境变量里，绝不入库）：
 *   NETEASE_COOKIE='...' node scripts/fetch-netease-tracks.mjs
 *
 * 歌单更新了（加歌/删歌）就重跑一次，然后提交 JSON。
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAYLIST_ID = process.argv[2] || '18117076786';
const OUT = path.join(ROOT, 'src', 'data', 'neteaseTracks.json');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const COOKIE = process.env.NETEASE_COOKIE;
if (!COOKIE) {
  console.error(
    [
      '缺少 NETEASE_COOKIE。',
      '',
      '这个歌单需要登录态才能看到全部曲目（匿名只返回 10 首）。',
      '从浏览器登录 music.163.com → F12 → Network → 任选请求 → 复制整串 Cookie，然后：',
      '',
      "  NETEASE_COOKIE='...' node scripts/fetch-netease-tracks.mjs",
      '',
      '生成的 JSON 会提交进仓库；Cookie 本身不会入库，也不会被线上使用。',
    ].join('\n')
  );
  process.exit(1);
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
  Cookie: COOKIE,
};

async function getJSON(url, tries = 5) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      return await res.json();
    } catch (e) {
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

const data = await getJSON(`https://music.163.com/api/playlist/detail?id=${PLAYLIST_ID}`);
const pl = data?.playlist ?? data?.result;
if (!pl?.tracks?.length) {
  console.error('没拿到曲目，检查 Cookie 是否过期、歌单 id 是否正确。code =', data?.code);
  process.exit(1);
}

const tracks = pl.tracks
  .filter((t) => t && t.id)
  .map((t) => ({
    id: t.id,
    name: t.name || '未知歌曲',
    artist: (t.ar || t.artists || []).map?.((a) => a.name).join(' / ') || '未知歌手',
    cover: t.al?.picUrl || t.album?.picUrl || '',
  }));

// 去重（同一首歌可能在歌单里出现两次）
const seen = new Set();
const unique = tracks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

const payload = {
  playlistId: PLAYLIST_ID,
  playlistName: pl.name || '',
  updatedAt: new Date().toISOString(),
  count: unique.length,
  tracks: unique,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 0) + '\n', 'utf8');

console.log(`歌单「${pl.name}」`);
console.log(`接口返回 ${pl.tracks.length} 首，去重后 ${unique.length} 首`);
console.log(`已写入 ${path.relative(ROOT, OUT)}（${(fs.statSync(OUT).size / 1024).toFixed(0)} KB）`);
