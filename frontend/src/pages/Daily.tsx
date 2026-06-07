import { Link } from 'react-router-dom';
import { useDailyChallenge, useSubmitDaily } from '../api/hooks';
import { GameEngine, type Answer } from '../components/GameEngine';
import { FullScreenLoader } from '../components/Loaders';

export default function Daily() {
  const { data, isLoading } = useDailyChallenge();
  const submit = useSubmitDaily();

  if (isLoading || !data) return <FullScreenLoader />;

  if (data.alreadyPlayed) {
    return (
      <div className="max-w-md mx-auto text-center space-y-5 py-16">
        <div className="text-6xl">✅</div>
        <h1 className="text-3xl font-extrabold">Daily Challenge done!</h1>
        <p className="text-spotify-gray">
          You scored <span className="text-spotify-green font-bold">{data.result?.score}</span> points
          today ({data.result?.correctCount} correct). Come back tomorrow for a new one.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/leaderboard" className="btn-green">View leaderboard</Link>
          <Link to="/games" className="btn-ghost">Play other modes</Link>
        </div>
      </div>
    );
  }

  if (!data.rounds || data.rounds.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <div className="text-5xl">🗓️</div>
        <h1 className="text-2xl font-bold">No challenge available yet</h1>
        <p className="text-spotify-gray">Check back shortly — today’s challenge is being prepared.</p>
        <Link to="/games" className="btn-ghost">Play other modes</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-4">
        <span className="inline-block rounded-full bg-spotify-green/15 border border-spotify-green/40 px-4 py-1 text-sm font-semibold">
          🗓️ Daily Challenge · {new Date(data.date).toLocaleDateString()}
        </span>
      </div>
      <GameEngine
        rounds={data.rounds}
        gameType={data.gameType}
        title="Daily Challenge"
        onSubmit={(answers: Answer[], durationMs) => submit.mutateAsync({ answers, durationMs })}
      />
    </div>
  );
}
