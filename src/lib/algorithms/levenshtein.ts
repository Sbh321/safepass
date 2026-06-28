/**
 * Levenshtein Distance — Dynamic Programming Implementation
 *
 * Computes the minimum edit distance between two strings using the classic
 * Wagner–Fischer dynamic programming algorithm.
 *
 * The edit distance D(a, b) is the minimum number of single-character operations
 * (insertions, deletions, substitutions) required to transform string `a` into `b`.
 *
 * Time complexity:  O(m × n)
 * Space complexity: O(m × n) — can be reduced to O(min(m,n)) with row-only storage
 *
 * For password policy enforcement we use a rolling-row optimization
 * (space O(n)) since we only need the final distance, not the full edit path.
 */

export interface BannedWordMatch {
  word: string;
  distance: number;
  isTooSimilar: boolean;
}

export interface SimilarityReport {
  matches: BannedWordMatch[];
  hasBannedSimilarity: boolean;
  closestMatch: BannedWordMatch | null;
}

/**
 * Computes Levenshtein edit distance between two strings using
 * a space-optimized two-row DP approach.
 *
 * The recurrence relation is:
 *   dp[i][j] = 0                              if i = 0 (empty prefix of a)
 *   dp[i][j] = i                              if j = 0 (empty prefix of b)
 *   dp[i][j] = dp[i-1][j-1]                  if a[i] = b[j] (no edit needed)
 *   dp[i][j] = 1 + min(
 *                dp[i-1][j],                  // deletion
 *                dp[i][j-1],                  // insertion
 *                dp[i-1][j-1]                 // substitution
 *              )                              otherwise
 *
 * @param a - First string
 * @param b - Second string
 * @returns The Levenshtein distance D(a, b) ≥ 0
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  const m = aLower.length;
  const n = bLower.length;

  // Base cases
  if (m === 0) return n;
  if (n === 0) return m;

  // prev[j] = dp[i-1][j], curr[j] = dp[i][j]
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  // Initialize first row: distance from empty string to each prefix of b
  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i; // distance from each prefix of a to empty string

    for (let j = 1; j <= n; j++) {
      const substitutionCost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;

      curr[j] = Math.min(
        prev[j] + 1,               // deletion from a
        curr[j - 1] + 1,           // insertion into a
        prev[j - 1] + substitutionCost // substitution
      );
    }

    // Swap rows for next iteration
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Computes the normalized similarity ratio between two strings.
 * Returns a value in [0, 1] where 1.0 means identical and 0.0 means maximally different.
 *
 * Normalized distance = 1 - (D(a,b) / max(|a|, |b|))
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity ratio in [0, 1]
 */
export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

/**
 * Checks whether a password is too similar to any word in a banned list.
 *
 * A password is flagged if:
 *   1. It is an exact substring match (case-insensitive), OR
 *   2. Its Levenshtein distance to a banned word is ≤ threshold (default: 3)
 *
 * The distance threshold of 3 catches common obfuscation tricks like:
 *   - "p@ssw0rd" → distance 3 from "password"
 *   - "adm1n" → distance 1 from "admin"
 *   - "secr3t!" → distance 2 from "secret"
 *
 * @param password - The password to check
 * @param bannedWords - List of forbidden words or patterns
 * @param distanceThreshold - Maximum edit distance to flag as "too similar" (default: 3)
 * @returns A SimilarityReport with all matches and a top-level flag
 */
export function checkBannedSimilarity(
  password: string,
  bannedWords: string[],
  distanceThreshold = 3
): SimilarityReport {
  const passwordLower = password.toLowerCase();
  const matches: BannedWordMatch[] = [];

  for (const word of bannedWords) {
    if (!word || word.length === 0) continue;

    const wordLower = word.toLowerCase();
    let distance: number;

    // Substring containment check: if the banned word appears verbatim inside the password
    if (passwordLower.includes(wordLower)) {
      distance = 0;
    } else {
      distance = levenshteinDistance(password, word);
    }

    const isTooSimilar = distance <= distanceThreshold;

    matches.push({ word, distance, isTooSimilar });
  }

  const flagged = matches.filter((m) => m.isTooSimilar);
  const closestMatch =
    matches.length > 0
      ? matches.reduce((best, m) => (m.distance < best.distance ? m : best), matches[0])
      : null;

  return {
    matches,
    hasBannedSimilarity: flagged.length > 0,
    closestMatch,
  };
}

/**
 * Common weak passwords and dictionary words to ban by default.
 * Organizations can extend this list via the PasswordPolicy model.
 */
export const DEFAULT_BANNED_WORDS: string[] = [
  "password", "passwd", "pass", "secret", "admin", "administrator",
  "login", "user", "guest", "root", "test", "demo", "welcome",
  "letmein", "monkey", "dragon", "master", "abc123", "qwerty",
  "football", "baseball", "superman", "batman", "iloveyou",
  "trustno1", "sunshine", "princess", "shadow", "michael",
  "charlie", "donald", "jennifer", "thomas", "jessica",
  "corvette", "starwars", "access", "hello", "nothing",
];
