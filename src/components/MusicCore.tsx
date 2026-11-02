"use client";

/**
 * 音乐内核：只负责「把播放器和歌单初始化起来」，不渲染任何 UI。
 *
 * 它挂在 Layout 里，全站每个页面都有。因为音频元素和状态都放在
 * lib/musicStore 的模块作用域里，配合 Astro 的客户端路由（页面不重载），
 * 切页面时 audio 一直活着——歌不停、也不重新洗牌。
 */

import { useEffect } from 'react';
import { initAudio, bootstrapPlaylist, syncAfterNavigation } from '../lib/musicStore';

export default function MusicCore() {
  useEffect(() => {
    initAudio();
    bootstrapPlaylist();
    syncAfterNavigation();

    // 客户端路由切换后，新页面的 UI 需要跟正在播放的状态对齐一次
    const onPageLoad = () => syncAfterNavigation();
    document.addEventListener('astro:page-load', onPageLoad);

    return () => document.removeEventListener('astro:page-load', onPageLoad);
  }, []);

  return null;
}
