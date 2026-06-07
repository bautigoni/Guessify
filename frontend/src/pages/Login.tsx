import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LOGIN_URL } from '../api/client';
import { useMe } from '../api/hooks';

const FEATURES = [
  { icon: '🎤', title: 'Guess The Lyrics', text: 'Identify songs from a snippet.' },
  { icon: '🔊', title: 'Guess The Song', text: 'Name the track from a preview.' },
  { icon: '🧠', title: 'Write The Lyrics', text: 'AI grades your memory.' },
  { icon: '🔥', title: 'Hardcore Mode', text: 'Your top tracks. Double points.' },
];

export default function Login() {
  const { data: user } = useMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get('error');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: hero */}
      <div className="flex flex-col justify-center px-6 sm:px-12 py-16 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 bg-spotify-green/20 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-lg"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-full bg-spotify-green grid place-items-center text-black text-2xl font-black">
              G
            </div>
            <span className="text-3xl font-extrabold">Guessify</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
            Your music.
            <br />
            <span className="text-spotify-green">Your trivia.</span>
          </h1>
          <p className="mt-6 text-lg text-spotify-gray">
            Connect your Spotify and turn your top tracks, artists and playlists into
            addictive music trivia. 8 game modes, daily challenges and global leaderboards.
          </p>

          {error && (
            <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm">
              Login failed ({error}). Please try again.
            </div>
          )}

          <a
            href={LOGIN_URL}
            className="btn-green inline-flex items-center gap-3 mt-8 text-lg"
          >
            <SpotifyGlyph />
            Continue with Spotify
          </a>
          <p className="mt-4 text-xs text-spotify-lightgray">
            We only request read access to your library. You can revoke it anytime in
            Spotify settings.
          </p>
        </motion.div>
      </div>

      {/* Right: feature grid */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-spotify-black to-spotify-darker p-12">
        <div className="grid grid-cols-2 gap-5 max-w-md">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="card p-6 glass"
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-spotify-gray mt-1">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpotifyGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.59 14.43a.62.62 0 01-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 11-.28-1.21c3.8-.87 7.07-.5 9.71 1.11.3.18.39.57.22.85zm1.22-2.72a.78.78 0 01-1.07.26c-2.69-1.65-6.79-2.13-9.98-1.16a.78.78 0 11-.45-1.49c3.64-1.1 8.16-.57 11.24 1.32.37.22.49.7.26 1.07zm.1-2.83C14.8 8.98 9.5 8.8 6.42 9.74a.93.93 0 11-.54-1.79c3.54-1.07 9.39-.86 13.09 1.34a.94.94 0 01-.96 1.61z" />
    </svg>
  );
}
