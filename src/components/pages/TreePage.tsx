'use client';

import CreativeWorkshopClient from '../../app-pages/tree/CreativeWorkshopClient';
import Shell from './Shell';

interface Props {
  posts: any[];
  chatters: any[];
  moments: any[];
}

export default function TreePage({ posts, chatters, moments }: Props) {
  return (
    <Shell>
      <CreativeWorkshopClient posts={posts} chatters={chatters} moments={moments} />
    </Shell>
  );
}
