import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGameModes, useStartGame, useSubmitGame } from '../api/hooks';
import { GameEngine, type Answer } from '../components/GameEngine';
import { FullScreenLoader } from '../components/Loaders';

export default function Play() {
  const { gameType = '' } = useParams();
  const { data: modes } = useGameModes();
  const start = useStartGame();
  const submit = useSubmitGame();

  const mode = modes?.find((m) => m.type === gameType);

  useEffect(() => {
    if (gameType) start.mutate({ gameType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType]);

  if (start.isPending || (!start.data && !start.isError)) {
    return (
      <div className="space-y-4">
        <FullScreenLoader />
      </div>
    );
  }

  if (start.isError) {
    const msg =
      (start.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      'Could not start the game.';
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <div className="text-5xl">😕</div>
        <h1 className="text-2xl font-bold">Unable to start</h1>
        <p className="text-spotify-gray">{msg}</p>
        <p className="text-sm text-spotify-lightgray">
          Tip: open the dashboard and tap “Sync Spotify” to import more of your library.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => start.mutate({ gameType })} className="btn-green">Retry</button>
          <Link to="/games" className="btn-ghost">Back</Link>
        </div>
      </div>
    );
  }

  const data = start.data!;
  return (
    <GameEngine
      rounds={data.rounds}
      gameType={data.gameType}
      title={mode?.title ?? 'Game'}
      onSubmit={(answers: Answer[], durationMs) =>
        submit.mutateAsync({ gameId: data.gameId, answers, durationMs })
      }
    />
  );
}
