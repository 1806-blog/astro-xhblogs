/**
 * 音乐全局状态（nanostores）
 *
 * 为什么从 React Context 换成全局 store：Astro 是岛屿架构，页面之间不共享
 * Context；而且开了客户端路由后，音频元素必须活在「页面之外」才能不被打断。
 * 用模块级 store + 模块级 audio 单例，页面怎么切都只有一份播放器。
 */

import { atom, computed } from 'nanostores';
import { siteConfig } from '../siteConfig';

export type PlayMode = 'loop' | 'single' | 'random';
export type LyricLine = { time: number; text: string };

export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrcUrl: string | null;
  lyrics: LyricLine[];
  startSec: number;
};

/* ------------------------------- 状态原子 -------------------------------- */

const initialVolume = (siteConfig as any).music?.volume ?? 0.35;

export const $playlist = atom<Track[]>([]);
export const $index = atom(0);
export const $isPlaying = atom(false);
export const $progress = atom(0);
export const $currentTime = atom(0);
export const $duration = atom(0);
export const $lyrics = atom<LyricLine[]>([]);
export const $currentLyric = atom('正在连接高可用神经云端...');
export const $isLoading = atom(true);
export const $volume = atom(initialVolume);
export const $isMuted = atom(false);
export const $playMode = atom<PlayMode>('loop');

export const $currentSong = computed([$playlist, $index], (list, i) => list[i]);

/* ------------------------------ 音频单例 -------------------------------- */

let audio: HTMLAudioElement | null = null;
let bootstrapped = false; // 防止每次导航都重新拉歌单
let skipOnError = 0;

function applyVolume() {
  if (audio) audio.volume = $isMuted.get() ? 0 : $volume.get();
}

export function getAudio() {
  return audio;
}

/** 由 MusicCore 在挂载时调用一次；重复调用是安全的 */
export function initAudio() {
  if (audio) return audio;

  const el = new Audio();
  el.preload = 'metadata';
  audio = el;

  el.addEventListener('timeupdate', handleTimeUpdate);
  el.addEventListener('loadedmetadata', handleLoadedMetadata);
  el.addEventListener('ended', handleEnded);
  el.addEventListener('error', handleError);
  el.addEventListener('play', () => $isPlaying.set(true));
  el.addEventListener('pause', () => $isPlaying.set(false));

  applyVolume();
  // 调试用：控制台里可以直接看 __audio 的播放状态
  (globalThis as any).__audio = el;
  return el;
}

/* -------------------------------- 歌词 ---------------------------------- */

export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText || lrcText.length > 30000) return [];

  const result: LyricLine[] = [];
  for (const line of lrcText.split(/\r?\n/)) {
    const matches = [...line.matchAll(/\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    if (!matches.length) continue;

    const text = line.replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
    if (!cleanText) continue;

    for (const m of matches) {
      const min = parseInt(m[1]);
      const sec = parseInt(m[2]);
      const ms = m[3] ? parseInt(m[3]) : 0;
      const divisor = m[3] && m[3].length === 3 ? 1000 : 100;
      result.push({ time: min * 60 + sec + ms / divisor, text: cleanText });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

/* -------------------------------- 初始化 -------------------------------- */

export async function bootstrapPlaylist() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    const res = await fetch('/api/music');
    const raw: any[] = await res.json();
    const list: Track[] = (Array.isArray(raw) ? raw : [])
      .filter((s) => s && s.url && !s.error)
      .map((s) => ({
        id: s.id || Math.random().toString(),
        title: s.name || '未知歌曲',
        artist: s.artist || s.author || '未知歌手',
        cover: s.cover || s.pic || '/images/opt/wall-06.webp',
        src: s.url,
        lrcUrl: null,
        lyrics: s.lrc ? parseLrc(s.lrc) : [],
        startSec: typeof s.startSec === 'number' ? s.startSec : 0,
      }));

    if (!list.length) {
      $currentLyric.set('云端链路受阻');
      $isLoading.set(false);
      return;
    }

    $playlist.set(list);
    loadTrack(0, false);
    $isLoading.set(false);
  } catch {
    $currentLyric.set('网络初始化失败');
    $isLoading.set(false);
    bootstrapped = false; // 允许下次导航重试
  }
}

/* -------------------------------- 播放控制 ------------------------------- */

function setLyricFor(track: Track) {
  $lyrics.set([]);
  if (track.lyrics?.length) {
    $lyrics.set(track.lyrics);
    $currentLyric.set(track.lyrics[0]?.text || '♪ 纯享音乐 ♪');
  } else if (track.lrcUrl) {
    $currentLyric.set('♪ 正在缓冲 ♪');
    fetch(track.lrcUrl)
      .then((r) => r.text())
      .then((text) => {
        const parsed = parseLrc(text);
        $lyrics.set(parsed);
        const list = [...$playlist.get()];
        if (list[track_indexOf(track)]) list[track_indexOf(track)].lyrics = parsed;
        $playlist.set(list);
      })
      .catch(() => $currentLyric.set('♪ 纯享音乐 ♪'));
  } else {
    $currentLyric.set('纯音乐请欣赏');
  }
}

function track_indexOf(track: Track) {
  return $playlist.get().findIndex((t) => t.id === track.id);
}

export function loadTrack(index: number, autoplay = true) {
  const list = $playlist.get();
  const track = list[index];
  if (!track || !audio) return;

  $index.set(index);
  setLyricFor(track);

  if (audio.src !== track.src) audio.src = track.src;

  if (autoplay) {
    audio.play().catch(() => $isPlaying.set(false));
  } else {
    $isPlaying.set(false);
  }
}

export function togglePlay() {
  if (!audio) return;
  if (audio.paused) audio.play().catch(() => $isPlaying.set(false));
  else audio.pause();
}

export function nextSong() {
  const list = $playlist.get();
  if (!list.length) return;
  const mode = $playMode.get();
  const next =
    mode === 'random'
      ? Math.floor(Math.random() * list.length)
      : ($index.get() + 1) % list.length;
  loadTrack(next, true);
}

export function prevSong() {
  const list = $playlist.get();
  if (!list.length) return;
  const mode = $playMode.get();
  const prev =
    mode === 'random'
      ? Math.floor(Math.random() * list.length)
      : ($index.get() - 1 + list.length) % list.length;
  loadTrack(prev, true);
}

export function playSong(index: number) {
  loadTrack(index, true);
}

export function seekToPercent(percent: number) {
  if (!audio || !audio.duration) return;
  $progress.set(percent);
  audio.currentTime = (percent / 100) * audio.duration;
}

export function handleSeekEvent(e: { target: { value: string } }) {
  seekToPercent(Number(e.target.value));
}

export function setVolume(value: number) {
  $volume.set(value);
  if ($isMuted.get() && value > 0) $isMuted.set(false);
  applyVolume();
}

export function toggleMute() {
  $isMuted.set(!$isMuted.get());
  applyVolume();
}

export function togglePlayMode() {
  const cur = $playMode.get();
  $playMode.set(cur === 'loop' ? 'single' : cur === 'single' ? 'random' : 'loop');
}

/* -------------------------------- 事件回调 ------------------------------- */

function handleTimeUpdate() {
  if (!audio) return;
  const { currentTime, duration } = audio;
  $currentTime.set(currentTime);
  $duration.set(duration || 0);
  $progress.set((currentTime / (duration || 1)) * 100);

  const lines = $lyrics.get();
  if (lines.length) {
    const active = lines.slice().reverse().find((l) => currentTime >= l.time);
    if (active && active.text !== $currentLyric.get()) $currentLyric.set(active.text);
  }
}

// 元数据就绪：跳过 PJSK 前奏空白 + 重新套一次音量
function handleLoadedMetadata() {
  if (!audio) return;
  applyVolume();

  const track = $playlist.get()[$index.get()];
  if (track?.startSec > 0 && audio.currentTime < track.startSec) {
    audio.currentTime = track.startSec;
  }
  skipOnError = 0;
  handleTimeUpdate();
}

function handleEnded() {
  if (!audio) return;
  if ($playMode.get() === 'single') {
    audio.currentTime = 0;
    audio.play().catch(() => $isPlaying.set(false));
  } else {
    nextSong();
  }
}

function handleError() {
  // 音源坏掉自动跳下一首，最多连跳 3 次防死循环
  if (skipOnError < 3) {
    skipOnError += 1;
    nextSong();
  }
}

/** 页面切换后，把新页面的 UI 与正在播放的状态对齐 */
export function syncAfterNavigation() {
  if (audio && !audio.paused) $isPlaying.set(true);
  handleTimeUpdate();
}
