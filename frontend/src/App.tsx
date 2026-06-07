import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useMe } from './api/hooks';
import { Layout } from './components/Layout';
import { FullScreenLoader } from './components/Loaders';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Play from './pages/Play';
import Daily from './pages/Daily';
import Achievements from './pages/Achievements';
import Leaderboard from './pages/Leaderboard';

function Protected({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useMe();
  if (isLoading) return <FullScreenLoader />;
  if (isError || !user) return <Navigate to="/login" replace />;
  return <Layout user={user}>{children}</Layout>;
}

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/games"
          element={
            <Protected>
              <Games />
            </Protected>
          }
        />
        <Route
          path="/play/:gameType"
          element={
            <Protected>
              <Play />
            </Protected>
          }
        />
        <Route
          path="/daily"
          element={
            <Protected>
              <Daily />
            </Protected>
          }
        />
        <Route
          path="/achievements"
          element={
            <Protected>
              <Achievements />
            </Protected>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <Protected>
              <Leaderboard />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
