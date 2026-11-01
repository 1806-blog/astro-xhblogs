'use client';

import type { ReactNode } from 'react';

import { ThemeProvider } from '../ThemeProvider';
import { MusicProvider } from '../MusicProvider';
import { ToastProvider } from '../ToastProvider';
import FloatingPlayer from '../FloatingPlayer';
import GlobalToolbox from '../GlobalToolbox';
import CyberCat from '../CyberCat';
import ClickEffect from '../ClickEffect';
import { siteConfig } from '../../siteConfig';

/**
 * 原项目在 app/layout.tsx 里用 ThemeProvider + MusicProvider 包住全站。
 * Astro 的岛屿之间不共享 React Context，所以每个页面岛屿自己再包一层 Shell，
 * 保证 useTheme / useMusic 这些 hook 在页面内仍然可用。
 */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MusicProvider>
        <ToastProvider>{children}</ToastProvider>
        <FloatingPlayer />
        <GlobalToolbox />
        {siteConfig.enableCyberCat && <CyberCat />}
        <ClickEffect />
      </MusicProvider>
    </ThemeProvider>
  );
}
