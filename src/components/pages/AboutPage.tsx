'use client';

import { Suspense } from 'react';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import AboutClient from '../AboutClient';
import Shell from './Shell';

interface Props {
  contentHtml: string;
  coverImage: string;
  activities: any[];
}

export default function AboutPage({ contentHtml, coverImage, activities }: Props) {
  return (
    <Shell>
      <div className="min-h-screen relative pb-20">
        <Navbar />
        <PageTransition>
          <main className="w-[95%] md:w-[90%] max-w-4xl mx-auto mt-24 md:mt-28 relative z-10">
            <Suspense
              fallback={
                <div className="h-96 flex items-center justify-center text-slate-500 font-bold animate-pulse">
                  正在载入档案...
                </div>
              }
            >
              <AboutClient contentHtml={contentHtml} coverImage={coverImage} activities={activities} />
            </Suspense>
          </main>
        </PageTransition>
      </div>
    </Shell>
  );
}
