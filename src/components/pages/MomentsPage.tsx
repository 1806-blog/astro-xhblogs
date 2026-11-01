'use client';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import MomentList from '../../app-pages/moments/MomentList';
import Shell from './Shell';

interface Props {
  moments: any[];
  authorName: string;
  avatarUrl: string;
}

export default function MomentsPage({ moments, authorName, avatarUrl }: Props) {
  return (
    <Shell>
      <div className="min-h-screen relative pb-10 flex flex-col">
        <Navbar />
        <PageTransition>
          <MomentList moments={moments} authorName={authorName} avatarUrl={avatarUrl} />
        </PageTransition>
      </div>
    </Shell>
  );
}
