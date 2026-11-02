export const prerender = false;

import { siteConfig } from '../../siteConfig';
import sekaiCacheFile from '../../data/sekai-cache.json';
import neteaseTracksFile from '../../data/neteaseTracks.json';

// 这个歌单要登录态才能看到全部曲目，但线上不该带账号凭证跑。
// 做法：本地用 scripts/fetch-netease-tracks.mjs 拉一次全量存成 JSON，
// 运行时只读那个文件，匿名只用来取歌词。
const NET_EASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
  Cookie: 'NMTID=1',
};

type Song = {
  id: string;
  name: string;
  artist: string;
  cover: string;
  url: string;
  lrc?: string;
  source: 'sekai' | 'netease';
  /** 网易云原始曲目 id，取歌词用，返回前会剔掉 */
  _rawId?: number;
  /** 从第几秒开始播放（PJSK 曲目有前奏空白，对应 JSON 的 f 字段） */
  startSec?: number;
};

const MUSIC = (siteConfig as any).music ?? {};
const VERBOSE_LOG = process.env.MUSIC_DEBUG === '1';
const SEKAI_API: string = MUSIC.sekaiApi ?? 'https://api.nightcord.de5.net/sekai/music_data.json';
const SEKAI_CDN: string = MUSIC.sekaiCdn ?? 'https://assets.nightcord.de5.net/music';
const SEKAI_PICK: number = MUSIC.sekaiPick ?? 8;
const NETEASE_PICK: number = MUSIC.neteasePick ?? 10;

/* --------------------------------- 随机 --------------------------------- */

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------ 音源可用性 ------------------------------- */

// PJSK 曲库里有些曲目根本没传完整版音频（HEAD 直接 404），
// 抽到就成哑炮。这里做一次探测并缓存结果，避免每轮都重新请求。
const audioOk = new Set<string>();
const audioBad = new Set<string>();

async function isPlayable(url: string): Promise<boolean> {
  if (audioOk.has(url)) return true;
  if (audioBad.has(url)) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      audioOk.add(url);
      return true;
    }
    audioBad.add(url);
    return false;
  } catch {
    // 网络抖动不算「坏」，不写缓存，下次还能再试
    return false;
  }
}

/** 从打乱后的候选里挑出可播放的若干首，最多尝试 limit 次 */
async function pickPlayable(candidates: Song[], count: number): Promise<Song[]> {
  const picked: Song[] = [];
  const maxTries = Math.min(candidates.length, count * 4);
  for (let i = 0; i < maxTries && picked.length < count; i++) {
    const song = candidates[i];
    if (await isPlayable(song.url)) picked.push(song);
  }
  return picked;
}

/* ------------------------------- 并发控制 -------------------------------- */

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        out[index] = await fn(items[index]);
      } catch {
        out[index] = undefined as unknown as R;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

/* -------------------------------- 网易云 --------------------------------- */

// 曲目列表来自 src/data/neteaseTracks.json（由 scripts/fetch-netease-tracks.mjs 生成）。
// 线上不碰账号凭证：只读静态文件，匿名 API 只用来取歌词。
const NETEASE_TRACKS: Song[] = ((neteaseTracksFile as any).tracks ?? []).map((t: any) => ({
  id: `ne-${t.id}`,
  name: t.name || '未知歌曲',
  artist: t.artist || '未知歌手',
  cover: t.cover || '',
  url: `https://music.163.com/song/media/outer/url?id=${t.id}.mp3`,
  source: 'netease' as const,
  _rawId: t.id,
}));

const lyricCache = new Map<string, string>();

function fetchNeteaseTracks(): Song[] {
  if (!NETEASE_TRACKS.length) throw new Error('neteaseTracks.json 为空，先跑 scripts/fetch-netease-tracks.mjs');
  if (VERBOSE_LOG) {
    console.log('[music] 网易云曲库:', NETEASE_TRACKS.length, '首 | 歌单:', (neteaseTracksFile as any).playlistName,
      '| 更新于:', (neteaseTracksFile as any).updatedAt);
  }
  return NETEASE_TRACKS;
}

/** 只给抽中的曲目配歌词，结果按 id 缓存 */
async function attachLyrics(songs: Song[]): Promise<Song[]> {
  return mapLimit(songs, 3, async (song: any) => {
    const rawId = song._rawId;
    if (!rawId) return song;
    if (lyricCache.has(rawId)) return { ...song, lrc: lyricCache.get(rawId) };
    try {
      const r = await fetch(
        `https://music.163.com/api/song/lyric?id=${rawId}&lv=-1&kv=-1&tv=-1`,
        { headers: NET_EASE_HEADERS, signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return song;
      const j: any = await r.json();
      const lyric = j?.lrc?.lyric || '';
      lyricCache.set(rawId, lyric);
      return { ...song, lrc: lyric };
    } catch {
      return song;
    }
  });
}

/* --------------------------------- PJSK --------------------------------- */

type SekaiCache = { items: Song[]; at: number } | null;
let sekaiCache: SekaiCache = null;
const SEKAI_TTL = 10 * 60 * 1000;

function buildSekaiSongs(raw: any[]): Song[] {
  return raw
    .map((m) => {
      const vocal = Array.isArray(m.v) && m.v.length > 0 ? m.v[0] : null;
      const audioAsset = vocal?.a;
      if (!audioAsset || !m.a) return null;
      return {
        id: `sk-${m.i}`,
        name: m.tz || m.t || '未知曲目',
        artist: [m.c, vocal?.c].filter(Boolean).join(' · ') || 'PJSK',
        cover: `${SEKAI_CDN}/jacket/${m.a}/${m.a}.webp`,
        url: `${SEKAI_CDN}/long/${audioAsset}/${audioAsset}.mp3`,
        source: 'sekai' as const,
        // f = fillerSec，PJSK 音频开头有一段空白，跳过它
        startSec: typeof m.f === 'number' ? m.f : 0,
      };
    })
    .filter(Boolean) as Song[];
}

async function fetchSekaiAll(): Promise<Song[]> {
  if (sekaiCache && Date.now() - sekaiCache.at < SEKAI_TTL) return sekaiCache.items;

  // 1) 先试远端（4 秒快速失败；这个 api 域名本身很慢）
  try {
    const res = await fetch(SEKAI_API, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        // 该接口偶发被截断，补齐尾部再试一次
        data = JSON.parse(text.replace(/,\s*$/, '') + ']}');
      }
      const items = buildSekaiSongs(data?.m ?? []);
      if (items.length) {
        sekaiCache = { items, at: Date.now() };
        return items;
      }
    }
  } catch {
    /* 远端不可用，落到本地缓存 */
  }

  // 2) 回退：仓库里的本地快照（739 首）
  const local = buildSekaiSongs((sekaiCacheFile as any)?.m ?? []);
  if (local.length) {
    sekaiCache = { items: local, at: Date.now() };
    return local;
  }

  throw new Error('sekai 数据不可用');
}

/* -------------------------------- 混播排序 ------------------------------- */

function interleave(a: Song[], b: Song[]): Song[] {
  const out: Song[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

/* --------------------------------- 路由 --------------------------------- */

export async function GET({ request }: { request: Request }) {
  const errors: string[] = [];
  const debug = new URL(request.url).searchParams.has('debug');

  // 两边都拿，任何一边挂了都不影响另一边；两边都打乱后随机取
  const [netease, sekai] = await Promise.all([
    Promise.resolve()
      .then(() => attachLyrics(shuffle(fetchNeteaseTracks()).slice(0, NETEASE_PICK)))
      .catch((e) => {
        errors.push(`netease: ${e.message}`);
        return [] as Song[];
      }),
    fetchSekaiAll()
      .then((all) => pickPlayable(shuffle(all), SEKAI_PICK))
      .catch((e) => {
        errors.push(`sekai: ${e.message}`);
        return [] as Song[];
      }),
  ]);

  const playlist = interleave(sekai, netease).map(({ _rawId, ...rest }) => rest);

  if (!playlist.length) {
    return new Response(
      JSON.stringify({
        error: 'no music available',
        errors,
        ...(debug ? { debug: { neteasePool: NETEASE_TRACKS.length, sekaiApi: SEKAI_API, pick: SEKAI_PICK } } : {}),
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  return new Response(JSON.stringify(playlist), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // 每次刷新都重新抽，别让缓存把「随机」吃掉
      'cache-control': 'no-store',
      // HTTP 头只允许 ASCII，中文要编码
      ...(errors.length ? { 'x-music-warnings': encodeURIComponent(errors.join(' | ')) } : {}),
    },
  });
}
