import type { GameType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { gradeLyrics, tokenSimilarity, type LyricGrade } from './ai.js';
import { getLyricsForTrack } from './lyrics/index.js';
import type { GameRound } from './game.js';

const BASE_POINTS = 100;
const HARDCORE_MULTIPLIER = 2;

export interface SubmittedAnswer {
  index: number;
  choiceId?: string;
  text?: string; // write-the-lyrics attempt
  blanks?: string[]; // complete-the-lyrics answers
}

export interface RoundResult {
  index: number;
  correct: boolean;
  points: number;
  correctAnswer?: string;
  accuracy?: number;
  grade?: LyricGrade;
}

export interface GradedGame {
  score: number;
  correctCount: number;
  totalRounds: number;
  results: RoundResult[];
}

export async function gradeGame(
  gameType: GameType,
  answerKey: GameRound[],
  answers: SubmittedAnswer[],
): Promise<GradedGame> {
  const multiplier = gameType === 'HARDCORE' ? HARDCORE_MULTIPLIER : 1;
  const byIndex = new Map(answers.map((a) => [a.index, a]));
  const results: RoundResult[] = [];
  let score = 0;
  let correctCount = 0;

  for (const round of answerKey) {
    const ans = byIndex.get(round.index);
    let result: RoundResult = { index: round.index, correct: false, points: 0 };

    if (round.prompt.type === 'cloze') {
      result = gradeCloze(round, ans, multiplier);
    } else if (round.prompt.type === 'title' && gameType === 'WRITE_THE_LYRICS') {
      result = await gradeWrite(round, ans, multiplier);
    } else {
      result = gradeMultipleChoice(round, ans, multiplier);
    }

    if (result.correct) correctCount += 1;
    score += result.points;
    results.push(result);
  }

  return { score, correctCount, totalRounds: answerKey.length, results };
}

function gradeMultipleChoice(
  round: GameRound,
  ans: SubmittedAnswer | undefined,
  multiplier: number,
): RoundResult {
  const correct = Boolean(ans?.choiceId && ans.choiceId === round.correctChoiceId);
  return {
    index: round.index,
    correct,
    points: correct ? BASE_POINTS * multiplier : 0,
    correctAnswer: round.correctChoiceId,
  };
}

function gradeCloze(
  round: GameRound,
  ans: SubmittedAnswer | undefined,
  multiplier: number,
): RoundResult {
  const expected = round.prompt.blanks ?? [];
  const given = ans?.blanks ?? [];
  if (expected.length === 0) {
    return { index: round.index, correct: false, points: 0 };
  }
  let hit = 0;
  for (let i = 0; i < expected.length; i++) {
    const exp = (expected[i] ?? '').toLowerCase().trim();
    const got = (given[i] ?? '').toLowerCase().trim();
    if (exp && exp === got) hit += 1;
  }
  const accuracy = Math.round((hit / expected.length) * 100);
  const correct = hit === expected.length;
  return {
    index: round.index,
    correct,
    points: Math.round((hit / expected.length) * BASE_POINTS * multiplier),
    accuracy,
    correctAnswer: expected.join(', '),
  };
}

async function gradeWrite(
  round: GameRound,
  ans: SubmittedAnswer | undefined,
  multiplier: number,
): Promise<RoundResult> {
  const attempt = ans?.text ?? '';
  const track = await prisma.track.findUnique({ where: { id: round.trackId } });
  const lyr = await getLyricsForTrack(round.trackId);
  if (!track || !lyr) {
    return { index: round.index, correct: false, points: 0 };
  }
  const grade = await gradeLyrics(track.title, track.artist, lyr.lyrics, attempt);
  const correct = grade.accuracy >= 60;
  return {
    index: round.index,
    correct,
    points: Math.round((grade.accuracy / 100) * BASE_POINTS * multiplier),
    accuracy: grade.accuracy,
    grade,
  };
}

export { tokenSimilarity };
