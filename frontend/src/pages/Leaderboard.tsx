import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDailyLeaderboard, useGlobalLeaderboard } from '../api/hooks';
import { Skeleton } from '../components/Loaders';
import type { LeaderboardEntry } from '../lib/types';

type Tab = 'global' | 'daily';

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>('global');
  const global = useGlobalLeaderboard();
  const daily = useDailyLeaderboard();

  const entries: LeaderboardEntry[] =
    tab === 'global' ? (global.data ?? []) : (daily.data?.leaderboard ?? []);
  const isLoading = tab === 'global' ? global.isLoading : daily.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl sm:text-4xl font-extrabold">Leaderboard</h1>
        <p className="text-spotify-gray mt-1">See how you rank against other players.</p>
      </header>

      <div className="inline-flex rounded-full bg-spotify-card p-1 border border-white/10">
        <TabButton active={tab === 'global'} onClick={() => setTab('global')}>
          🌍 Global
        </TabButton>
        <TabButton active={tab === 'daily'} onClick={() => setTab('daily')}>
          🗓️ Daily
        </TabButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-10 text-center text-spotify-gray">
          No scores yet — be the first to play!
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <motion.div
              key={e.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={`card flex items-center gap-4 p-3 px-4 ${
                e.isMe ? 'border-spotify-green/50 bg-spotify-green/10' : ''
              }`}
            >
              <span className={`w-8 text-center font-black ${rankColor(e.rank)}`}>
                {medal(e.rank)}
              </span>
              {e.avatar ? (
                <img src={e.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-spotify-cardHover grid place-items-center font-bold">
                  {(e.displayName ?? 'U').charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {e.displayName ?? 'Anonymous'}{' '}
                  {e.isMe && <span className="text-spotify-green text-xs">(you)</span>}
                </p>
                {e.gamesPlayed != null && (
                  <p className="text-xs text-spotify-gray">{e.gamesPlayed} games</p>
                )}
              </div>
              <span className="font-extrabold text-spotify-green">
                {(e.totalScore ?? e.score ?? 0).toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
        active ? 'bg-spotify-green text-black' : 'text-spotify-gray hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function medal(rank: number) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
}
function rankColor(rank: number) {
  if (rank <= 3) return 'text-xl';
  return 'text-spotify-gray';
}
