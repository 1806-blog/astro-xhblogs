'use client';

import Link from 'next/link';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import { siteConfig } from '../../siteConfig';
import ClientSocials from '../ClientSocials';
import SidebarLyric from '../SidebarLyric';
import BackButton from '../BackButton';
import Comments from '../Comments';
import Shell from './Shell';

function generateCalendarMatrix(year: number, month: number, targetDay: number) {
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return { days, targetDay };
}

export interface ChatterDetailProps {
  title: string;
  date: string;
  mood: string;
  tags: string[];
  cover: string;
  contentHtml: string;
  recentChatters: { slug: string; title: string; date: string }[];
}

export default function ChatterDetailPage({
  title,
  date,
  mood,
  tags,
  cover,
  contentHtml,
  recentChatters,
}: ChatterDetailProps) {
  const dateObj = new Date(date || '2026-03-24');
  const yearStr = dateObj.getFullYear();
  const monthNum = dateObj.getMonth() + 1;
  const dayNum = dateObj.getDate();

  const { days: calendarDays } = generateCalendarMatrix(yearStr, monthNum, dayNum);
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <Shell>
      <div className="min-h-screen relative pb-20">
        <Navbar />

        <PageTransition>
          <main className="w-[95%] md:w-[90%] max-w-6xl mx-auto mt-24 md:mt-28 flex flex-col lg:flex-row gap-6 md:gap-8 relative z-10">
            <article className="flex-1 bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden transition-colors duration-700">
              {cover && (
                <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700 relative group">
                  <img
                    src={cover}
                    alt="封面"
                    className="w-full h-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="p-5 md:p-14 relative">
                <BackButton />

                <header className="mb-6 md:mb-10 border-b border-slate-300/30 dark:border-slate-700/50 pb-5 md:pb-8 relative">
                  <h1 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 md:mb-6 tracking-tight transition-colors duration-700 pr-16 md:pr-24 leading-snug md:leading-tight">
                    {title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-1.5 md:gap-2 text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-500/5 dark:bg-indigo-400/10 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl text-xs md:text-sm border border-indigo-500/10">
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {date}
                    </div>

                    {mood && (
                      <div className="flex items-center gap-1.5 md:gap-2 text-pink-600 dark:text-pink-400 font-black bg-pink-500/5 dark:bg-pink-400/10 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl text-xs md:text-sm border border-pink-500/10">
                        ✨ 心情：{mood}
                      </div>
                    )}

                    {tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold bg-slate-500/5 dark:bg-slate-400/10 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl text-xs md:text-sm border border-slate-500/10"
                      >
                        <span className="text-[10px] md:text-xs opacity-70">#</span> {tag}
                      </div>
                    ))}
                  </div>
                </header>

                <div className="relative">
                  <div
                    className="prose prose-slate dark:prose-invert prose-base md:prose-lg max-w-none text-slate-800 dark:text-slate-200 font-serif transition-colors duration-700 leading-relaxed scroll-smooth"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                </div>

                <div className="mt-10 md:mt-12">
                  <Comments />
                </div>
              </div>
            </article>

            <aside className="w-full lg:w-[320px] flex flex-col gap-6 flex-shrink-0">
              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-xl text-center">
                <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md mb-4 hover:rotate-3 transition-transform">
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
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-wider">
                    {yearStr}年{monthNum}月
                  </h3>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                  {weekDays.map((day) => (
                    <div key={day} className="text-[10px] font-black text-slate-400 uppercase">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                  {calendarDays.map((day, index) => (
                    <div key={index} className="flex justify-center items-center">
                      {day ? (
                        <div
                          className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all duration-300
                        ${day === dayNum ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-110' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700'}`}
                        >
                          {day}
                        </div>
                      ) : (
                        <div className="w-8 h-8"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-xl">
                <h3 className="font-black text-slate-900 dark:text-white mb-4 border-l-4 border-indigo-500 pl-2 text-xs tracking-widest uppercase">
                  Recent Records
                </h3>
                <div className="space-y-4">
                  {recentChatters.map((p) => (
                    <Link key={p.slug} href={`/chatter/${p.slug}`} className="group block">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase">{p.date}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </main>
        </PageTransition>
      </div>
    </Shell>
  );
}
