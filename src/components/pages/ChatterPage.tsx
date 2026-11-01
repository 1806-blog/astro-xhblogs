'use client';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import ChatterBoard from '../../app-pages/chatter/ChatterBoard';
import Shell from './Shell';

interface Props {
  chatters: any[];
}

export default function ChatterPage({ chatters }: Props) {
  return (
    <Shell>
      <div className="min-h-screen relative pb-10">
        <Navbar />
        <PageTransition>
          <ChatterBoard chatters={chatters} />
        </PageTransition>
      </div>
    </Shell>
  );
}
