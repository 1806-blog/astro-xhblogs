'use client';

import Navbar from '../Navbar';
import DailyBriefing from '../DailyBriefing';
import PageTransition from '../PageTransition';
import SearchBar from '../SearchBar';
import { siteConfig } from '../../siteConfig';
import CloudPlayer from '../CloudPlayer';
import ThemeToggleBlock from '../ThemeToggleBlock';
import ProfileCard from '../ProfileCard';
import SiteDashboard from '../SiteDashboard';
import LyricBar from '../LyricBar';
import { ToastProvider } from '../ToastProvider';
import LatestPostsCarousel from '../LatestPostsCarousel';
import LatestChatterCarousel from '../LatestChatterCarousel';

import Shell from './Shell';

type Post = {
  slug: string;
  title: string;
  description: string;
  cover?: string;
  date: string;
  formattedDate: string;
  content?: string;
  [key: string]: any;
};

type Chatter = {
  slug: string;
  title: string;
  description: string;
  cover: string;
  date: string;
  formattedDate: string;
};

interface Props {
  allPosts: Post[];
  allChatters: Chatter[];
  chatterCount: number;
  realPhotoCount: number;
  latestAlbum: { id: string; title: string; description: string; cover: string; date?: string };
}

export default function HomePage({ allPosts, allChatters, chatterCount, realPhotoCount, latestAlbum }: Props) {
  const top5Posts =
    allPosts.length > 0
      ? allPosts.slice(0, 5)
      : [
          {
            slug: 'none',
            title: '暂无文章',
            description: '快去写第一篇吧！',
            cover: siteConfig.defaultPostCover,
            date: '',
            formattedDate: '',
          },
        ];

  const top5Chatters =
    allChatters.length > 0
      ? allChatters.slice(0, 5)
      : [
          {
            slug: 'none',
            title: '暂无记录',
            description: '记录一段思绪...',
            cover: siteConfig.defaultPostCover,
            date: '',
            formattedDate: '',
          },
        ];

  return (
    <Shell>
      <div className="min-h-screen relative pb-10">
        <Navbar />
        <PageTransition>
          <div className="w-full max-w-6xl mx-auto mt-24 sm:mt-28 px-4 sm:px-6 lg:px-10 relative z-10">
            <SearchBar posts={allPosts} />

            <main className="flex flex-col gap-6 w-full mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                <div className="col-span-1 lg:col-span-7 flex flex-col">
                  <ProfileCard postCount={allPosts.length} chatterCount={chatterCount} photoCount={realPhotoCount} />
                </div>
                <div className="col-span-1 lg:col-span-5 flex flex-col">
                  <CloudPlayer />
                </div>
              </div>

              <div className="w-full mt-[-10px]">
                <LyricBar />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                <div className="col-span-1 lg:col-span-4 flex flex-col min-h-[300px]">
                  <LatestPostsCarousel posts={top5Posts} />
                </div>

                <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
                  <a
                    href="/photowall"
                    className="w-full rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl overflow-hidden transition-all duration-700 hover:scale-[1.02] relative group min-h-[200px] sm:min-h-[220px] flex-shrink-0"
                  >
                    <img
                      src={latestAlbum.cover}
                      alt={latestAlbum.title}
                      className="w-full h-full absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                    />
                    {/* 白天模式下卡面本身很亮，纯黑/30 压不住白字，改成底部渐变保证可读性 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/5 dark:from-black/80 dark:via-black/45 dark:to-black/15 group-hover:from-black/60 transition-colors duration-500"></div>
                    <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 right-6">
                      <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 underline decoration-pink-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">
                        {latestAlbum.title}
                      </h3>
                      <p className="text-white/95 text-sm sm:text-lg line-clamp-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">{latestAlbum.description}</p>
                    </div>
                  </a>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full flex-1">
                    <div className="sm:col-span-2 flex flex-col min-h-[200px]">
                      <LatestChatterCarousel chatters={top5Chatters} />
                    </div>
                    <div className="sm:col-span-1 flex flex-col min-h-[120px]">
                      <ThemeToggleBlock />
                    </div>
                  </div>
                </div>
              </div>

              <DailyBriefing />

              <div className="w-full mt-4">
                <SiteDashboard />
              </div>
            </main>
          </div>
        </PageTransition>
      </div>
    </Shell>
  );
}
