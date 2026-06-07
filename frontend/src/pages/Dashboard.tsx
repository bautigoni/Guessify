import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard, useMe, useRefreshLibrary } from '../api/hooks';
import { CardSkeletonGrid, Skeleton } from '../components/Loaders';
import type { DashboardData } from '../lib/types';

export default function Dashboard() {
  const { data: user } = useMe();
  const { data, isLoading } = useDashboard();
  const refresh = useRefreshLibrary();

  const greeting = getGreeting();

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-spotify-gray">{greeting},</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            {user?.displayName ?? 'Listener'} 👋
          </h1>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="btn-ghost text-sm"
        >
          {refresh.isPending ? 'Syncing…' : 'Sync Spotify'}
        </button>
      </section>

      {/* Stats */}
      {isLoading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <StatsRow stats={data.stats} />
      )}

      {/* Play CTA */}
      <section className="grid sm:grid-cols-3 gap-4">
        <Link
          to="/games"
          className="card card-hover p-6 sm:col-span-2 bg-gradient-to-r from-spotify-green/20 to-transparent border-spotify-green/30 flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl font-extrabold">Play a game</h2>
            <p className="text-spotify-gray mt-1">8 modes built from your library.</p>
          </div>
          <span className="text-4xl">🎮</span>
        </Link>
        <Link to="/daily" className="card card-hover p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Daily Challenge</h2>
            <p className="text-spotify-gray text-sm mt-1">New every day</p>
          </div>
          <span className="text-3xl">🗓️</span>
        </Link>
      </section>

      {/* Top tracks chart */}
      {data && data.topTracks.length > 0 && (
        <section>
          <SectionTitle>Your top tracks at a glance</SectionTitle>
          <div className="card p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topTracks.slice(0, 8).map((t) => ({
                  name: t.title.length > 12 ? t.title.slice(0, 12) + '…' : t.title,
                  rank: 9 - t.rank,
                }))}
              >
                <XAxis dataKey="name" tick={{ fill: '#b3b3b3', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                />
                <Bar dataKey="rank" fill="#1DB954" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Top artists */}
      <section>
        <SectionTitle>Top artists</SectionTitle>
        {isLoading || !data ? (
          <CardSkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {data.topArtists.map((a, i) => (
              <Tile key={a.id} index={i} image={a.image} title={a.name} subtitle={a.genres[0] ?? 'Artist'} round />
            ))}
          </div>
        )}
      </section>

      {/* Top tracks */}
      <section>
        <SectionTitle>Top tracks</SectionTitle>
        {isLoading || !data ? (
          <CardSkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {data.topTracks.map((t, i) => (
              <Tile key={t.id} index={i} image={t.coverImage} title={t.title} subtitle={t.artist} />
            ))}
          </div>
        )}
      </section>

      {/* Playlists */}
      {data && data.playlists.length > 0 && (
        <section>
          <SectionTitle>Your playlists</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {data.playlists.map((p, i) => (
              <Tile key={p.id} index={i} image={p.image} title={p.name} subtitle={`${p.trackCount} tracks`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatsRow({ stats }: { stats: DashboardData['stats'] }) {
  const items = [
    { label: 'Total Score', value: stats.totalScore.toLocaleString(), icon: '⭐' },
    { label: 'Games Played', value: stats.gamesPlayed, icon: '🎮' },
    { label: 'Correct Answers', value: stats.correctAnswers, icon: '✅' },
    { label: 'Saved Tracks', value: stats.savedTracks, icon: '💚' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="card p-5"
        >
          <div className="text-2xl mb-2">{s.icon}</div>
          <div className="text-2xl font-extrabold">{s.value}</div>
          <div className="text-sm text-spotify-gray">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

function Tile({
  image,
  title,
  subtitle,
  round,
  index,
}: {
  image: string | null;
  title: string;
  subtitle: string;
  round?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="card card-hover p-4 group cursor-default"
    >
      <div
        className={`aspect-square w-full overflow-hidden mb-3 bg-spotify-cardHover grid place-items-center ${
          round ? 'rounded-full' : 'rounded-md'
        }`}
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <span className="text-2xl text-spotify-lightgray">🎵</span>
        )}
      </div>
      <p className="font-semibold truncate">{title}</p>
      <p className="text-sm text-spotify-gray truncate">{subtitle}</p>
    </motion.div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-extrabold mb-4">{children}</h2>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
