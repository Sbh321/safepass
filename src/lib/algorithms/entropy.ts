/**
 * Shannon Entropy Password Strength Estimator
 *
 * Computes information-theoretic entropy H = L * log2(N) where:
 *   L = password length
 *   N = effective character pool size derived from detected character classes
 *
 * The pool size dynamically expands as new character varieties are detected,
 * giving a realistic upper-bound estimate rather than assuming the full ASCII set.
 */

export type StrengthLabel = "Critical" | "Weak" | "Fair" | "Strong" | "Excellent";

export interface EntropyResult {
  bits: number;
  poolSize: number;
  label: StrengthLabel;
  score: number; // 0–100 normalized score
  crackTimeSeconds: number;
  crackTimeDisplay: string;
  suggestions: string[];
}

interface CharClass {
  pattern: RegExp;
  poolContribution: number;
  label: string;
}

const CHAR_CLASSES: CharClass[] = [
  { pattern: /[a-z]/, poolContribution: 26, label: "lowercase letters" },
  { pattern: /[A-Z]/, poolContribution: 26, label: "uppercase letters" },
  { pattern: /[0-9]/, poolContribution: 10, label: "digits" },
  { pattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, poolContribution: 32, label: "symbols" },
  { pattern: /[\s]/, poolContribution: 1, label: "spaces" },
  { pattern: /[^\x00-\x7F]/, poolContribution: 64, label: "unicode characters" },
];

/**
 * Guessing speed assumption: a modern GPU cluster attacking bcrypt/PBKDF2
 * at ~10,000 guesses/second (conservative, policy-grade passwords).
 * For raw MD5/SHA1, this would be billions/sec — we assume hardened storage.
 */
const GUESSES_PER_SECOND = 1e10;

/**
 * Formats a duration given in seconds into a human-readable crack time string.
 */
function formatCrackTime(seconds: number): string {
  if (seconds < 1) return "instantly";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`;
  if (seconds < 3.154e9) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 3.154e12) return `${Math.round(seconds / 3.154e9)} thousand years`;
  if (seconds < 3.154e15) return `${Math.round(seconds / 3.154e12)} million years`;
  return "practically forever";
}

/**
 * Maps entropy bits to a normalized 0–100 score using a logistic-like curve.
 * Anchors: 0 bits → 0, 40 bits → ~20, 60 bits → ~50, 80 bits → ~75, 128 bits → 100.
 */
function bitsToScore(bits: number): number {
  const score = Math.min(100, Math.round((bits / 128) * 100));
  return score;
}

/**
 * Derives a qualitative strength label from a normalized 0–100 score.
 */
function scoreToLabel(score: number): StrengthLabel {
  if (score < 20) return "Critical";
  if (score < 40) return "Weak";
  if (score < 60) return "Fair";
  if (score < 80) return "Strong";
  return "Excellent";
}

/**
 * Builds actionable improvement suggestions based on which character classes
 * are absent from the password.
 */
function buildSuggestions(password: string, detectedClasses: string[]): string[] {
  const suggestions: string[] = [];

  if (!/[a-z]/.test(password)) suggestions.push("Add lowercase letters");
  if (!/[A-Z]/.test(password)) suggestions.push("Add uppercase letters");
  if (!/[0-9]/.test(password)) suggestions.push("Add digits");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    suggestions.push("Add special symbols (!@#$%^&*)");
  if (password.length < 12) suggestions.push("Use at least 12 characters");
  if (password.length < 16) suggestions.push("Consider 16+ characters for better protection");

  // Detect sequential or repeated patterns
  if (/(.)\1{2,}/.test(password)) suggestions.push("Avoid repeated characters (aaa, 111)");
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password))
    suggestions.push("Avoid sequential letter patterns (abc, xyz)");
  if (/(?:012|123|234|345|456|567|678|789|890)/.test(password))
    suggestions.push("Avoid sequential digit patterns (123, 456)");

  return suggestions;
}

/**
 * Computes the Shannon entropy of a password.
 *
 * Formula: H = L × log₂(N)
 * where L is the length and N is the effective character pool size.
 *
 * @param password - The plaintext password to evaluate.
 * @returns A detailed EntropyResult with bits, strength label, crack time, and suggestions.
 */
export function computeEntropy(password: string): EntropyResult {
  if (!password || password.length === 0) {
    return {
      bits: 0,
      poolSize: 0,
      label: "Critical",
      score: 0,
      crackTimeSeconds: 0,
      crackTimeDisplay: "instantly",
      suggestions: ["Enter a password to evaluate its strength"],
    };
  }

  let poolSize = 0;
  const detectedLabels: string[] = [];

  for (const charClass of CHAR_CLASSES) {
    if (charClass.pattern.test(password)) {
      poolSize += charClass.poolContribution;
      detectedLabels.push(charClass.label);
    }
  }

  // Clamp pool to minimum of 1 to avoid log(0)
  poolSize = Math.max(poolSize, 1);

  const bits = password.length * Math.log2(poolSize);

  // Crack time: (2^bits / 2) / guesses_per_second (average case = half the keyspace)
  const crackTimeSeconds = Math.pow(2, bits) / 2 / GUESSES_PER_SECOND;

  const score = bitsToScore(bits);
  const label = scoreToLabel(score);
  const suggestions = buildSuggestions(password, detectedLabels);

  return {
    bits: Math.round(bits * 10) / 10,
    poolSize,
    label,
    score,
    crackTimeSeconds,
    crackTimeDisplay: formatCrackTime(crackTimeSeconds),
    suggestions,
  };
}

/**
 * Returns a Tailwind CSS color class corresponding to the strength label.
 * Useful for progress bars, badges, and meter fills.
 */
export function strengthColor(label: StrengthLabel): string {
  switch (label) {
    case "Critical": return "text-red-500";
    case "Weak": return "text-orange-500";
    case "Fair": return "text-yellow-500";
    case "Strong": return "text-blue-400";
    case "Excellent": return "text-emerald-400";
  }
}

export function strengthBgColor(label: StrengthLabel): string {
  switch (label) {
    case "Critical": return "bg-red-500";
    case "Weak": return "bg-orange-500";
    case "Fair": return "bg-yellow-500";
    case "Strong": return "bg-blue-400";
    case "Excellent": return "bg-emerald-400";
  }
}
