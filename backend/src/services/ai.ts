import OpenAI from 'openai';
import { env } from '../config/env.js';

export interface LyricGrade {
  accuracy: number; // 0-100
  missingLines: string[];
  mistakes: string[];
  explanation: string;
  method: 'openai' | 'heuristic';
}

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!env.openai.apiKey) return null;
  if (!client) client = new OpenAI({ apiKey: env.openai.apiKey });
  return client;
}

/**
 * Grades a user's attempt at writing a song's lyrics. Uses the OpenAI API when
 * configured, otherwise falls back to a deterministic token-overlap heuristic
 * so the feature still works without a key.
 */
export async function gradeLyrics(
  title: string,
  artist: string,
  reference: string,
  attempt: string,
): Promise<LyricGrade> {
  const ai = getClient();
  if (ai) {
    try {
      return await gradeWithOpenAI(ai, title, artist, reference, attempt);
    } catch (err) {
      console.warn('[ai] OpenAI grading failed, falling back to heuristic', err);
    }
  }
  return heuristicGrade(reference, attempt);
}

async function gradeWithOpenAI(
  ai: OpenAI,
  title: string,
  artist: string,
  reference: string,
  attempt: string,
): Promise<LyricGrade> {
  const completion = await ai.chat.completions.create({
    model: env.openai.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a strict but fair lyrics grader for a music trivia game. ' +
          'Compare the user attempt against the reference lyrics. Reward partial ' +
          'matches and correct paraphrasing of lines. Respond ONLY with JSON of the ' +
          'shape: {"accuracy": number (0-100), "missingLines": string[], ' +
          '"mistakes": string[], "explanation": string}.',
      },
      {
        role: 'user',
        content: `Song: "${title}" by ${artist}\n\nREFERENCE LYRICS:\n${reference}\n\nUSER ATTEMPT:\n${attempt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  return {
    accuracy: clamp(Number(parsed.accuracy) || 0, 0, 100),
    missingLines: Array.isArray(parsed.missingLines) ? parsed.missingLines : [],
    mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
    method: 'openai',
  };
}

// ---------------------------------------------------------------------------
// Heuristic fallback
// ---------------------------------------------------------------------------

function normalize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);
}

export function heuristicGrade(reference: string, attempt: string): LyricGrade {
  const refTokens = normalize(reference);
  const attemptSet = new Set(normalize(attempt));
  if (refTokens.length === 0) {
    return {
      accuracy: 0,
      missingLines: [],
      mistakes: [],
      explanation: 'No reference lyrics available to grade against.',
      method: 'heuristic',
    };
  }

  let matched = 0;
  for (const tok of refTokens) if (attemptSet.has(tok)) matched += 1;
  const accuracy = Math.round((matched / refTokens.length) * 100);

  const refLines = reference.split('\n').map((l) => l.trim()).filter(Boolean);
  const attemptLower = attempt.toLowerCase();
  const missingLines = refLines.filter((line) => {
    const tokens = normalize(line);
    if (tokens.length === 0) return false;
    const hit = tokens.filter((t) => attemptLower.includes(t)).length;
    return hit / tokens.length < 0.5;
  });

  return {
    accuracy,
    missingLines: missingLines.slice(0, 10),
    mistakes: [],
    explanation: `Matched ${matched}/${refTokens.length} words against the reference lyrics.`,
    method: 'heuristic',
  };
}

/** Simple line-level similarity used to validate "complete the lyrics" blanks. */
export function tokenSimilarity(a: string, b: string): number {
  const at = new Set(normalize(a));
  const bt = normalize(b);
  if (bt.length === 0) return 0;
  let hit = 0;
  for (const t of bt) if (at.has(t)) hit += 1;
  return hit / bt.length;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
