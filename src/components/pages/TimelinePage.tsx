'use client';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import TimelineClient from '../TimelineClient';
import Shell from './Shell';

interface Props {
  posts: any[];
  tags: { name: string; count: number }[];
}

export default function TimelinePage({ posts, tags }: Props) {
  return (
    <Shell>
      <div className="min-h-screen relative pb-32">
        <Navbar />
        <PageTransition>
          <TimelineClient posts={posts} tags={tags} />
        </PageTransition>
      </div>
    </Shell>
  );
}
