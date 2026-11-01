'use client';

import { useEffect, useState, useMemo } from 'react';

/**
 * next/navigation 的 Astro 垫片。
 * 原项目用了 useRouter / usePathname / useSearchParams 三件套，
 * 这里用浏览器原生 API 等价实现，SSR 阶段返回安全默认值。
 */

const isBrowser = () => typeof window !== 'undefined';

export function usePathname(): string {
  // 初始值必须与 SSR 一致（都是 '/'），否则 hydration 会不匹配；
  // 真实路径在挂载后的 effect 里同步。
  const [pathname, setPathname] = useState<string>('/');

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  return useMemo(() => {
    if (!isBrowser()) return {} as T;
    const parts = window.location.pathname.split('/').filter(Boolean);
    return { slug: parts[parts.length - 1] ?? '' } as unknown as T;
  }, []);
}

export function useRouter() {
  return {
    push: (href: string) => {
      if (isBrowser()) window.location.href = href;
    },
    replace: (href: string) => {
      if (isBrowser()) window.location.replace(href);
    },
    back: () => {
      if (isBrowser()) window.history.back();
    },
    forward: () => {
      if (isBrowser()) window.history.forward();
    },
    refresh: () => {
      if (isBrowser()) window.location.reload();
    },
    prefetch: (_href: string) => {
      /* Astro 不做客户端预取，空实现 */
    },
  };
}

export function redirect(url: string): never {
  if (isBrowser()) window.location.href = url;
  throw new Error(`REDIRECT:${url}`);
}

export function notFound(): never {
  throw new Error('NOT_FOUND');
}
