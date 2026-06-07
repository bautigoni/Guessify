import { motion } from 'framer-motion';
import { useAchievements } from '../api/hooks';
import { Skeleton } from '../components/Loaders';

export default function Achievements() {
  const { data, isLoading } = useAchievements();

  const unlockedCount = data?.filter((a) => a.unlocked).length ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl sm:text-4xl font-extrabold">Achievements</h1>
        <p className="text-spotify-gray mt-1">
          {data ? `${unlockedCount} of ${data.length} unlocked` : 'Track your progress'}
        </p>
      </header>

      {isLoading || !data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((a, i) => {
            const pct = Math.min(100, Math.round((a.progress / a.threshold) * 100));
            return (
              <motion.div
                key={a.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card p-5 ${a.unlocked ? 'border-spotify-green/40' : 'opacity-90'}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-12 w-12 rounded-full grid place-items-center text-2xl ${
                      a.unlocked ? 'bg-spotify-green/20' : 'bg-spotify-cardHover grayscale'
                    }`}
                  >
                    {a.icon ?? '🏆'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold flex items-center gap-2">
                      {a.name}
                      {a.unlocked && <span className="text-spotify-green text-sm">✓</span>}
                    </h3>
                    <p className="text-sm text-spotify-gray">{a.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 rounded-full bg-spotify-cardHover overflow-hidden">
                    <div className="h-full bg-spotify-green" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-spotify-gray mt-1">
                    {a.progress} / {a.threshold}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
