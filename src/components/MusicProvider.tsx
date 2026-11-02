"use client";

/**
 * 兼容层：原来全站用的是 <MusicProvider> + useMusic()。
 * 现在状态搬到了 lib/musicStore（跨岛屿共享），这里只保留同样的 API 形状，
 * 让 CloudPlayer / LyricBar / FloatingPlayer / MusicPage 一行都不用改。
 *
 * <audio> 元素不再由这里渲染——它由 MusicCore 初始化的模块级单例持有，
 * 这样切页面时不会被卸载。
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@nanostores/react';

import {
  $playlist,
  $index,
  $currentSong,
  $isPlaying,
  $progress,
  $currentTime,
  $duration,
  $currentLyric,
  $isLoading,
  $volume,
  $isMuted,
  $playMode,
  togglePlay,
  nextSong,
  prevSong,
  handleSeekEvent,
  playSong,
  setVolume,
  toggleMute,
  togglePlayMode,
} from '../lib/musicStore';

/** 保留组件形态（ThemeProvider 里还在用它包一层），本身不再提供 Context */
export function MusicProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useMusic() {
  // 服务端渲染时 store 是空的，客户端可能已经有数据。
  // 首帧强制返回和 SSR 一致的「空状态」，挂载后再切到真实状态，避免 hydration 不匹配。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const playlist = useStore($playlist);
  const currentIndex = useStore($index);
  const currentSong = useStore($currentSong);
  const isPlaying = useStore($isPlaying);
  const progress = useStore($progress);
  const currentTime = useStore($currentTime);
  const duration = useStore($duration);
  const currentLyric = useStore($currentLyric);
  const isLoading = useStore($isLoading);
  const volume = useStore($volume);
  const isMuted = useStore($isMuted);
  const playMode = useStore($playMode);

  if (!mounted) {
    return {
      playlist: [] as typeof playlist,
      currentIndex: 0,
      currentSong: undefined as typeof currentSong,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      currentLyric: '正在连接高可用神经云端...',
      isLoading: true,
      volume,
      isMuted: false,
      playMode: 'loop' as const,
      togglePlay,
      nextSong,
      prevSong,
      handleSeek: handleSeekEvent,
      playSong,
      setVolume,
      toggleMute,
      togglePlayMode,
    };
  }

  return {
    playlist,
    currentIndex,
    currentSong,
    isPlaying,
    progress,
    currentTime,
    duration,
    currentLyric,
    isLoading,
    volume,
    isMuted,
    playMode,
    togglePlay,
    nextSong,
    prevSong,
    handleSeek: handleSeekEvent,
    playSong,
    setVolume,
    toggleMute,
    togglePlayMode,
  };
}
