/**
 * Cryptographically Secure Password Generator
 *
 * Uses the Fisher-Yates shuffle algorithm with `crypto.getRandomValues()` as the
 * entropy source, ensuring uniform distribution across all possible passwords.
 *
 * `Math.random()` is intentionally NOT used anywhere in this module as it is
 * seeded from a non-cryptographic PRNG and is predictable given enough observations.
 *
 * Fisher-Yates Algorithm (Knuth shuffle):
 *   For i from n-1 downto 1:
 *     j = random integer in [0, i]
 *     swap(array[i], array[j])
 *
 * This produces each permutation with equal probability (1/n!) unlike naive
 * approaches that suffer from modulo bias.
 */

export interface GeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean; // Excludes: 0, O, l, 1, I
  minUppercase?: number;
  minLowercase?: number;
  minNumbers?: number;
  minSymbols?: number;
}

const CHARSET_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const CHARSET_UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHARSET_NUMBERS = "0123456789";
const CHARSET_SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const AMBIGUOUS_CHARS = new Set(["0", "O", "l", "1", "I", "o"]);

/**
 * Generates a cryptographically secure random integer in the range [0, max).
 *
 * Uses rejection sampling to eliminate modulo bias: if the random value falls
 * in the biased region (values above `limit`), it is discarded and resampled.
 *
 * @param max - Exclusive upper bound (must be > 0 and ≤ 2^32)
 * @returns A uniformly distributed integer in [0, max)
 */
function secureRandomInt(max: number): number {
  if (max <= 0 || max > 2 ** 32) {
    throw new RangeError(`max must be in range (0, 2^32], got ${max}`);
  }

  // The largest multiple of `max` that fits in a 32-bit unsigned integer.
  // Values in [limit, 2^32) are discarded to avoid modulo bias.
  const limit = 2 ** 32 - ((2 ** 32) % max);
  const buf = new Uint32Array(1);

  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);

  return value % max;
}

/**
 * Fisher-Yates in-place shuffle of a character array using `crypto.getRandomValues`.
 *
 * @param array - Mutable array of characters to shuffle in place
 * @returns The same array, shuffled uniformly at random
 */
function fisherYatesShuffle(array: string[]): string[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    // Swap elements i and j
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

/**
 * Builds the active character pool from the provided generator options.
 * Filters out ambiguous characters if that option is enabled.
 *
 * @param options - GeneratorOptions specifying which character sets to include
 * @returns A string containing all eligible characters
 */
function buildCharPool(options: GeneratorOptions): string {
  let pool = "";

  if (options.includeLowercase) pool += CHARSET_LOWERCASE;
  if (options.includeUppercase) pool += CHARSET_UPPERCASE;
  if (options.includeNumbers) pool += CHARSET_NUMBERS;
  if (options.includeSymbols) pool += CHARSET_SYMBOLS;

  if (options.excludeAmbiguous) {
    pool = pool
      .split("")
      .filter((c) => !AMBIGUOUS_CHARS.has(c))
      .join("");
  }

  return pool;
}

/**
 * Generates a cryptographically secure password satisfying the given options.
 *
 * The algorithm:
 * 1. Builds the active character pool from enabled sets.
 * 2. Guarantees minimum character counts per class by selecting required chars first.
 * 3. Fills remaining slots from the full pool using `secureRandomInt`.
 * 4. Fisher-Yates shuffles the entire result array to randomize required-char positions.
 *
 * @param options - Configuration for length, character sets, and minimum counts.
 * @returns A uniformly random password string of the requested length.
 * @throws Error if no character sets are selected or length is insufficient.
 */
export function generatePassword(options: GeneratorOptions): string {
  const pool = buildCharPool(options);

  if (pool.length === 0) {
    throw new Error("At least one character set must be selected.");
  }

  const minRequired =
    (options.minUppercase ?? 0) +
    (options.minLowercase ?? 0) +
    (options.minNumbers ?? 0) +
    (options.minSymbols ?? 0);

  if (options.length < minRequired) {
    throw new Error(
      `Password length (${options.length}) is less than total required minimums (${minRequired}).`
    );
  }

  const chars: string[] = [];

  // Step 1: Satisfy minimum character class requirements
  const addRequired = (charset: string, count: number) => {
    const filtered = options.excludeAmbiguous
      ? charset.split("").filter((c) => !AMBIGUOUS_CHARS.has(c)).join("")
      : charset;
    if (filtered.length === 0) return;
    for (let i = 0; i < count; i++) {
      chars.push(filtered[secureRandomInt(filtered.length)]);
    }
  };

  if (options.minUppercase) addRequired(CHARSET_UPPERCASE, options.minUppercase);
  if (options.minLowercase) addRequired(CHARSET_LOWERCASE, options.minLowercase);
  if (options.minNumbers) addRequired(CHARSET_NUMBERS, options.minNumbers);
  if (options.minSymbols) addRequired(CHARSET_SYMBOLS, options.minSymbols);

  // Step 2: Fill remaining length from the full pool
  while (chars.length < options.length) {
    chars.push(pool[secureRandomInt(pool.length)]);
  }

  // Step 3: Shuffle to prevent required chars from clustering at the front
  return fisherYatesShuffle(chars).join("");
}

/**
 * Generates a memorable passphrase of `wordCount` random dictionary words
 * separated by `separator`. Uses `secureRandomInt` for word selection.
 *
 * @param wordCount - Number of words (default: 4)
 * @param separator - Character to join words (default: "-")
 * @returns A passphrase string
 */
export function generatePassphrase(wordCount = 4, separator = "-"): string {
  // Compact word list — a real implementation would import a full EFF wordlist
  const words = [
    "apple","bridge","castle","dragon","engine","forest","garden","harbor",
    "island","jungle","knight","lagoon","marble","nebula","ocean","palace",
    "quartz","river","silver","timber","umbrella","valley","walnut","xenon",
    "yellow","zenith","anchor","branch","candle","dawn","ember","falcon",
    "glacier","hollow","ivory","jasper","kelp","lantern","mossy","nova",
    "onyx","pebble","quill","rust","stone","thorn","upland","vortex",
    "willow","xylem","yonder","zephyr","amber","bloom","cobalt","dusk",
    "echo","flint","grove","haze","iron","jade","kestrel","lava","mist",
    "neon","opal","pine","quasar","rune","sage","tide","umber","vale",
    "wren","crystal","depth","eagle","frost","grain","hawk","inlet","jewel",
  ];

  const selected: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    selected.push(words[secureRandomInt(words.length)]);
  }
  return selected.join(separator);
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeAmbiguous: false,
  minUppercase: 2,
  minLowercase: 2,
  minNumbers: 2,
  minSymbols: 2,
};
