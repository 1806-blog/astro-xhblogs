'use client';

import Navbar from '../Navbar';
import PageTransition from '../PageTransition';
import FriendsBoard from '../../app-pages/friends/FriendsBoard';
import Shell from './Shell';

export default function FriendsPage() {
  return (
    <Shell>
      <div className="min-h-screen relative pb-20">
        <Navbar />
        <PageTransition>
          <div className="mt-28">
            <FriendsBoard />
          </div>
        </PageTransition>
      </div>
    </Shell>
  );
}
