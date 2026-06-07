import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLogout } from '../api/hooks';
import type { User } from '../lib/types';

const NAV = [
  { to: '/dashboard', label: 'Home', icon: '🏠' },
  { to: '/games', label: 'Games', icon: '🎮' },
  { to: '/daily', label: 'Daily', icon: '🗓️' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
  { to: '/achievements', label: 'Achievements', icon: '🏆' },
];

export function Layout({ user, children }: { user: User; children: React.ReactNode }) {
  const logout = useLogout();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 flex-col gap-2 p-5 bg-spotify-black/60 backdrop-blur-xl border-r border-white/5 sticky top-0 h-screen">
        <Brand />
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto">
          <UserChip user={user} onLogout={onLogout} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-spotify-black/70 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <Brand />
        <Avatar user={user} />
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 py-6"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-spotify-black/90 backdrop-blur-xl border-t border-white/10 flex justify-around py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 rounded-lg ${
                isActive ? 'text-spotify-green' : 'text-spotify-gray'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-full bg-spotify-green grid place-items-center text-black font-black">
        G
      </div>
      <span className="text-xl font-extrabold tracking-tight">Guessify</span>
    </div>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${
          isActive
            ? 'bg-spotify-cardHover text-white'
            : 'text-spotify-gray hover:text-white hover:bg-white/5'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      {label}
    </NavLink>
  );
}

function Avatar({ user }: { user: User }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className="h-9 w-9 rounded-full bg-spotify-cardHover grid place-items-center font-bold">
      {(user.displayName ?? 'U').charAt(0).toUpperCase()}
    </div>
  );
}

function UserChip({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{user.displayName ?? 'Listener'}</p>
        <button
          onClick={onLogout}
          className="text-xs text-spotify-gray hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
