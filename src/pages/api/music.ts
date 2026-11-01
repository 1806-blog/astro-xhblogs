export const prerender = false;

import { siteConfig } from '../../siteConfig';
import sekaiCacheFile from '../../data/sekai-cache.json';

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
  /** 从第几秒开始播放（PJSK 曲目有前奏空白，对应 JSON 的 f 字段） */
  startSec?: number;
};

const MUSIC = (siteConfig as any).music ?? {};
const VERBOSE_LOG = process.env.MUSIC_DEBUG === '1';
const SEKAI_API: string = MUSIC.sekaiApi ?? 'https://api.nightcord.de5.net/sekai/music_data.json';
const SEKAI_CDN: string = MUSIC.sekaiCdn ?? 'https://assets.nightcord.de5.net/music';
const SEKAI_PICK: number = MUSIC.sekaiPick ?? 8;
const NETEASE_PICK: number = MUSIC.neteasePick ?? 10;
const PLAYLIST_ID: string = MUSIC.neteasePlaylistId ?? '';

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

async function fetchNeteasePlaylist(): Promise<Song[]> {
  if (!PLAYLIST_ID) throw new Error('未配置 neteasePlaylistId');

  const res = await fetch(`https://music.163.com/api/playlist/detail?id=${PLAYLIST_ID}`, {
    headers: NET_EASE_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`playlist HTTP ${res.status}`);

  const data: any = await res.json();
  // 该接口有两种返回形态：{ playlist } 或 { result }
  const pl = data?.playlist ?? data?.result ?? null;
  let tracks: any[] = pl?.tracks ?? [];

  if (VERBOSE_LOG) {
    console.log(
      '[music] netease keys:', Object.keys(data || {}).join(','),
      '| tracks:', pl?.tracks?.length,
      '| trackIds:', pl?.trackIds?.length
    );
  }

  // 老接口有时只给 trackIds 不内联 track 详情，这里补一次查询
  if (!tracks.length && pl?.trackIds?.length) {
    const ids = pl.trackIds.slice(0, 60).map((t: any) => t.id);
    const detail = await fetch(`https://music.163.com/api/song/detail/?ids=[${ids.join(',')}]`, {
      headers: NET_EASE_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (detail.ok) {
      const dj: any = await detail.json();
      tracks = (dj.songs ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        ar: s.artists,
        al: s.album,
      }));
    }
  }

  if (!tracks.length) throw new Error(`playlist 无曲目 (code=${data?.code})`);

  const base = tracks.map((t) => ({
    id: `ne-${t.id}`,
    name: t.name || '未知歌曲',
    artist: (t.ar || t.artists || [])[0]?.name || '未知歌手',
    cover: t.al?.picUrl || t.album?.picUrl || '',
    url: `https://music.163.com/song/media/outer/url?id=${t.id}.mp3`,
    source: 'netease' as const,
    _rawId: t.id,
  }));

  // 歌词逐首取（限流 3 并发，失败就跳过，不影响播放）
  const withLrc = await mapLimit(base, 3, async (song) => {
    try {
      const r = await fetch(
        `https://music.163.com/api/song/lyric?id=${song._rawId}&lv=-1&kv=-1&tv=-1`,
        { headers: NET_EASE_HEADERS, signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return song;
      const j: any = await r.json();
      return { ...song, lrc: j?.lrc?.lyric || '' };
    } catch {
      return song;
    }
  });

  return withLrc.map(({ _rawId, ...rest }: any) => rest);
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
    fetchNeteasePlaylist()
      .then((all) => shuffle(all).slice(0, NETEASE_PICK))
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

  const playlist = interleave(sekai, netease);

  if (!playlist.length) {
    return new Response(
      JSON.stringify({
        error: 'no music available',
        errors,
        ...(debug ? { debug: { PLAYLIST_ID, sekaiApi: SEKAI_API, pick: SEKAI_PICK } } : {}),
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
      'cache-control': 'public, max-age=60',
      // HTTP 头只允许 ASCII，中文要编码
      ...(errors.length ? { 'x-music-warnings': encodeURIComponent(errors.join(' | ')) } : {}),
    },
  });
}
