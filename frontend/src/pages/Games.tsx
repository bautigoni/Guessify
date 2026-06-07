import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameModes } from '../api/hooks';
import { Skeleton } from '../components/Loaders';

export default function Games() {
  const { data: modes, isLoading } = useGameModes();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl sm:text-4xl font-extrabold">Game Modes</h1>
        <p className="text-spotify-gray mt-1">Pick a mode and test your music knowledge.</p>
      </header>

      {isLoading || !modes ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/play/${mode.type}`}
                className={`card card-hover p-6 h-full flex flex-col group relative overflow-hidden ${
                  mode.type === 'HARDCORE'
                    ? 'border-spotify-green/40 bg-gradient-to-br from-spotify-green/15 to-transparent'
                    : ''
                }`}
              >
                <div className="text-4xl mb-4">{mode.icon}</div>
                <h2 className="text-xl font-extrabold">{mode.title}</h2>
                <p className="text-spotify-gray text-sm mt-2 flex-1">{mode.description}</p>
                <span className="mt-4 text-spotify-green font-bold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Play <span>→</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
