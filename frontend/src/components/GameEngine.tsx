import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameRound, SubmitGameResponse } from '../lib/types';
import { AudioPreview } from './AudioPreview';

export interface Answer {
  index: number;
  choiceId?: string;
  text?: string;
  blanks?: string[];
}

interface Props {
  rounds: GameRound[];
  gameType: string;
  title: string;
  onSubmit: (answers: Answer[], durationMs: number) => Promise<SubmitGameResponse>;
}

const ROUND_SECONDS = 30;
const TIMED_TYPES = new Set([
  'GUESS_THE_LYRICS',
  'GUESS_THE_SONG',
  'GUESS_THE_ARTIST',
  'GUESS_THE_ALBUM',
  'GUESS_THE_YEAR',
  'HARDCORE',
  'DAILY_CHALLENGE',
]);

export function GameEngine({ rounds, gameType, title, onSubmit }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [result, setResult] = useState<SubmitGameResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());

  const timed = TIMED_TYPES.has(gameType);
  const round = rounds[current];
  const isLast = current === rounds.length - 1;

  const setAnswer = (a: Answer) =>
    setAnswers((prev) => ({ ...prev, [a.index]: { ...prev[a.index], ...a } }));

  const next = () => {
    if (isLast) void finish();
    else setCurrent((c) => c + 1);
  };

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const list = rounds.map((r) => answers[r.index] ?? { index: r.index });
      const res = await onSubmit(list, Date.now() - startRef.current);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) return <Results result={result} title={title} />;
  if (!round) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressHeader
        title={title}
        current={current}
        total={rounds.length}
        timed={timed}
        roundKey={current}
        onExpire={next}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="card p-6 sm:p-8 mt-4"
        >
          <RoundPrompt
            round={round}
            gameType={gameType}
            answer={answers[round.index]}
            onAnswer={setAnswer}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center mt-6">
        <span className="text-sm text-spotify-gray">
          {Object.keys(answers).length}/{rounds.length} answered
        </span>
        <button onClick={next} disabled={submitting} className="btn-green">
          {submitting ? 'Scoring…' : isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function ProgressHeader({
  title,
  current,
  total,
  timed,
  roundKey,
  onExpire,
}: {
  title: string;
  current: number;
  total: number;
  timed: boolean;
  roundKey: number;
  onExpire: () => void;
}) {
  const [seconds, setSeconds] = useState(ROUND_SECONDS);

  useEffect(() => {
    if (!timed) return;
    setSeconds(ROUND_SECONDS);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          onExpire();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, timed]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold">{title}</h1>
        <span className="text-sm text-spotify-gray">
          Round {current + 1} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-spotify-cardHover overflow-hidden">
        <motion.div
          className="h-full bg-spotify-green"
          animate={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
      {timed && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-spotify-cardHover overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                seconds <= 5 ? 'bg-red-500' : 'bg-spotify-green/60'
              }`}
              style={{ width: `${(seconds / ROUND_SECONDS) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-spotify-gray w-6 text-right">{seconds}s</span>
        </div>
      )}
    </div>
  );
}

function RoundPrompt({
  round,
  gameType,
  answer,
  onAnswer,
}: {
  round: GameRound;
  gameType: string;
  answer?: Answer;
  onAnswer: (a: Answer) => void;
}) {
  const { prompt, choices, index } = round;

  if (prompt.type === 'audio') {
    return (
      <div className="space-y-6">
        <AudioPreview url={prompt.previewUrl} />
        <Choices choices={choices ?? []} selected={answer?.choiceId} onSelect={(id) => onAnswer({ index, choiceId: id })} />
      </div>
    );
  }

  if (prompt.type === 'lyrics') {
    return (
      <div className="space-y-6">
        <blockquote className="text-xl sm:text-2xl font-semibold leading-relaxed text-center whitespace-pre-line border-l-4 border-spotify-green pl-4 py-2">
          “{prompt.lyricsSnippet}”
        </blockquote>
        <Choices choices={choices ?? []} selected={answer?.choiceId} onSelect={(id) => onAnswer({ index, choiceId: id })} />
      </div>
    );
  }

  if (prompt.type === 'cloze') {
    return <ClozePrompt round={round} answer={answer} onAnswer={onAnswer} />;
  }

  // title prompt: either multiple choice (album/year) or write-the-lyrics textarea
  if (gameType === 'WRITE_THE_LYRICS' && !choices) {
    return (
      <div className="space-y-5">
        <TrackHeader title={prompt.title} artist={prompt.artist} cover={prompt.coverImage} />
        <p className="text-spotify-gray text-sm text-center">
          Write as many lyrics as you can remember. AI will grade your accuracy.
        </p>
        <textarea
          value={answer?.text ?? ''}
          onChange={(e) => onAnswer({ index, text: e.target.value })}
          rows={8}
          placeholder="Type the lyrics here…"
          className="w-full rounded-xl bg-spotify-dark border border-white/10 p-4 text-white focus:border-spotify-green focus:outline-none resize-none"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TrackHeader title={prompt.title} artist={prompt.artist} cover={prompt.coverImage} />
      <Choices choices={choices ?? []} selected={answer?.choiceId} onSelect={(id) => onAnswer({ index, choiceId: id })} />
    </div>
  );
}

function ClozePrompt({
  round,
  answer,
  onAnswer,
}: {
  round: GameRound;
  answer?: Answer;
  onAnswer: (a: Answer) => void;
}) {
  const parts = useMemo(() => (round.prompt.clozeText ?? '').split('____'), [round.prompt.clozeText]);
  const blankCount = parts.length - 1;
  const blanks = answer?.blanks ?? Array(blankCount).fill('');

  const update = (i: number, val: string) => {
    const copy = [...blanks];
    copy[i] = val;
    onAnswer({ index: round.index, blanks: copy });
  };

  return (
    <div className="space-y-5">
      <TrackHeader title={round.prompt.title} artist={round.prompt.artist} />
      <p className="text-lg sm:text-xl leading-loose text-center flex flex-wrap justify-center items-center gap-1">
        {parts.map((part, i) => (
          <span key={i} className="contents">
            <span>{part}</span>
            {i < blankCount && (
              <input
                value={blanks[i] ?? ''}
                onChange={(e) => update(i, e.target.value)}
                className="inline-block w-28 text-center bg-spotify-dark border-b-2 border-spotify-green focus:outline-none px-2 py-0.5 rounded-t"
                aria-label={`blank ${i + 1}`}
              />
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

function TrackHeader({ title, artist, cover }: { title?: string; artist?: string; cover?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {cover ? (
        <img src={cover} alt="" className="h-28 w-28 rounded-lg object-cover" />
      ) : (
        <div className="h-28 w-28 rounded-lg bg-spotify-cardHover grid place-items-center text-3xl">🎵</div>
      )}
      <div className="text-center">
        <p className="text-xl font-extrabold">{title}</p>
        {artist && <p className="text-spotify-gray">{artist}</p>}
      </div>
    </div>
  );
}

function Choices({
  choices,
  selected,
  onSelect,
}: {
  choices: { id: string; label: string; sublabel?: string }[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {choices.map((c) => {
        const active = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`text-left rounded-xl border p-4 transition-all active:scale-[0.98] ${
              active
                ? 'border-spotify-green bg-spotify-green/15'
                : 'border-white/10 bg-spotify-dark hover:border-white/30 hover:bg-spotify-cardHover'
            }`}
          >
            <p className="font-semibold">{c.label}</p>
            {c.sublabel && <p className="text-sm text-spotify-gray">{c.sublabel}</p>}
          </button>
        );
      })}
    </div>
  );
}

function Results({ result, title }: { result: SubmitGameResponse; title: string }) {
  const pct = result.totalRounds ? Math.round((result.correctCount / result.totalRounds) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto text-center space-y-6"
    >
      <div className="text-6xl">{pct >= 70 ? '🎉' : pct >= 40 ? '👏' : '🎧'}</div>
      <h1 className="text-3xl font-extrabold">{title} — complete!</h1>

      <div className="card p-8">
        <div className="text-5xl font-black text-spotify-green">{result.score}</div>
        <p className="text-spotify-gray">points</p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <div className="text-2xl font-bold">{result.correctCount}/{result.totalRounds}</div>
            <div className="text-sm text-spotify-gray">correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{pct}%</div>
            <div className="text-sm text-spotify-gray">accuracy</div>
          </div>
        </div>
      </div>

      {result.results.some((r) => r.grade) && (
        <div className="card p-5 text-left space-y-3">
          <h3 className="font-bold">AI feedback</h3>
          {result.results
            .filter((r) => r.grade)
            .map((r) => (
              <div key={r.index} className="text-sm">
                <p className="text-spotify-green font-semibold">Accuracy: {r.accuracy}%</p>
                <p className="text-spotify-gray">{r.grade?.explanation}</p>
                {r.grade?.missingLines.length ? (
                  <p className="text-spotify-lightgray mt-1">
                    Missing: {r.grade.missingLines.slice(0, 3).join(' · ')}
                  </p>
                ) : null}
              </div>
            ))}
        </div>
      )}

      {result.unlockedAchievements.length > 0 && (
        <div className="card p-5 border-spotify-green/40">
          <h3 className="font-bold mb-2">🏆 Achievement unlocked!</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {result.unlockedAchievements.map((a) => (
              <span key={a.key} className="rounded-full bg-spotify-green/15 border border-spotify-green/40 px-3 py-1 text-sm">
                {a.icon} {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button onClick={() => window.location.reload()} className="btn-green">Play again</button>
        <a href="/games" className="btn-ghost">Other modes</a>
      </div>
    </motion.div>
  );
}
