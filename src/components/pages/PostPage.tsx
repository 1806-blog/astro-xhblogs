'use client';

import Link from 'next/link';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import { siteConfig } from '../../siteConfig';
import ClientSocials from '../ClientSocials';
import ClientTOC from '../ClientTOC';
import BackButton from '../BackButton';
import Comments from '../Comments';
import SidebarLyric from '../SidebarLyric';
import Shell from './Shell';

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface Props {
  title: string;
  date: string;
  tags: string[];
  cover: string;
  contentHtml: string;
  toc: TocItem[];
  recentPosts: { slug: string; title: string; date: string }[];
}

export default function PostPage({ title, date, tags, cover, contentHtml, toc, recentPosts }: Props) {
  return (
    <Shell>
      <div className="min-h-screen relative pb-20">
        <Navbar />
        <PageTransition>
          <main className="w-[95%] md:w-[90%] max-w-6xl mx-auto mt-24 md:mt-28 flex flex-col lg:flex-row gap-6 md:gap-8 relative z-10">
            <article className="flex-1 bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden transition-colors duration-700">
              <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700 relative group">
                <img
                  src={cover}
                  alt="封面"
                  className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105"
                />
              </div>

              <div className="p-5 md:p-12 relative">
                <BackButton />

                <header className="mb-6 md:mb-8 border-b border-slate-300/50 dark:border-slate-700 pb-5 md:pb-6 relative">
                  <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight transition-colors duration-700 pr-16 md:pr-24 leading-snug">
                    {title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-1.5 md:gap-2 text-indigo-700 dark:text-indigo-400 font-bold bg-white/30 dark:bg-slate-900/50 px-3 md:px-4 py-1.5 md:py-2 rounded-full w-max text-xs md:text-sm transition-colors duration-700 shadow-sm border border-white/20 dark:border-white/5">
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      写作时间：{date}
                    </div>

                    {tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 text-pink-600 dark:text-pink-400 font-bold bg-white/30 dark:bg-slate-900/50 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition-colors duration-700 shadow-sm border border-white/20 dark:border-white/5"
                      >
                        <span className="text-[10px] md:text-xs opacity-70">#</span> {tag}
                      </div>
                    ))}
                  </div>
                </header>

                <div className="relative">
                  <div
                    id="article-content"
                    className="prose prose-slate dark:prose-invert prose-base md:prose-lg max-w-none text-slate-800 dark:text-slate-200 transition-colors duration-700 scroll-smooth"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                </div>

                <div className="mt-12 md:mt-16">
                  <Comments />
                </div>
              </div>
            </article>

            <aside className="w-full lg:w-[320px] flex flex-col gap-6 flex-shrink-0">
              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-xl text-center">
                <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md mb-4 transition-transform duration-500 hover:rotate-3">
                  <img
                    src={siteConfig.avatarUrl}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover bg-white"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{siteConfig.authorName}</h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-4">
                  {siteConfig.bio}
                </p>
                <ClientSocials />
              </div>

              <SidebarLyric />

              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-xl">
                <h3 className="font-black text-slate-900 dark:text-white mb-4 border-l-4 border-indigo-500 pl-2 text-sm">
                  RECOMMENDED
                </h3>
                <div className="space-y-4">
                  {recentPosts.map((p) => (
                    <Link key={p.slug} href={`/posts/${p.slug}`} className="group block">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase">{p.date}</p>
                    </Link>
                  ))}
                </div>
              </div>

              {toc.length > 0 && <ClientTOC toc={toc} />}
            </aside>
          </main>
        </PageTransition>
      </div>
    </Shell>
  );
}
