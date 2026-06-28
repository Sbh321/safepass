# SafePass

A corporate password vault and policy manager built with a zero-knowledge architecture — meaning the server never sees your passwords, ever.

Think 1Password or Bitwarden, but built from scratch with a focus on understanding exactly how the cryptography and security algorithms work under the hood.

---

## What Problem Does It Solve?

Most companies share passwords over Slack, store them in spreadsheets, or use personal password managers that aren't designed for teams. SafePass gives a company a single place to store credentials, enforce password rules, and manage who can access what — without anyone (including us, the developers) being able to read the stored secrets.

---

## The Core Idea: Zero-Knowledge Encryption

This is the most important architectural decision in the project.

When you store a password in SafePass, here's what happens:

1. You set a **Master Password** when you first log in. This never leaves your browser.
2. Your browser uses that Master Password + a random salt to derive an **encryption key** via PBKDF2 (310,000 iterations of SHA-256). This is the same standard used by password managers like 1Password.
3. Every secret you save is encrypted in your browser with AES-256-GCM before it's sent to our server.
4. The server stores only **ciphertext** (scrambled gibberish) and the random **IV** (initialization vector) used during encryption.

The server has zero ability to decrypt your vault. If the database gets breached, the attacker gets encrypted blobs they can't use. If we (the developers) wanted to read your passwords, we structurally cannot — there's no server-side decryption code path at all.

```
Your Master Password  ──▶  PBKDF2 (310k rounds)  ──▶  AES-256 Key  ──▶  encrypt/decrypt
                                                                              │
                                        Server only sees: { ciphertext, iv, salt }
                                        Server never sees: key or plaintext
```

The derived key lives only in memory (Zustand store). It's gone when you close the tab. Every time you come back, you re-enter your Master Password and re-derive the key locally.

---

## Three Custom Algorithms

We implemented three security algorithms from scratch — no npm packages.

### 1. Shannon Entropy (`src/lib/algorithms/entropy.ts`)

Measures how hard a password is to brute-force, expressed in bits.

```
H = L × log₂(N)
```

Where `L` is password length and `N` is the size of the character pool (how many unique characters are possible given what's in the password — lowercase, uppercase, digits, symbols each add to the pool).

Example: `hello` uses only lowercase letters (pool = 26), so `H = 5 × log₂(26) ≈ 23.5 bits`. That's weak. `h3Ll0!` uses all four classes (pool = 95), so `H = 6 × log₂(95) ≈ 39.3 bits`. Better.

We convert bits to a real-world crack time estimate assuming an attacker can try 10 billion guesses per second (modern GPU cluster). The result drives the color-coded strength meter you see when typing a password anywhere in the app.

### 2. Levenshtein Distance (`src/lib/algorithms/levenshtein.ts`)

Catches passwords that are "too close" to known weak ones, even with substitutions.

Levenshtein distance counts the minimum number of single-character edits (insert, delete, replace) needed to turn one string into another. `password` → `p@ssw0rd` is only distance 2 — two character replacements.

We maintain a list of ~30 common weak passwords and check every new password against the whole list. If the distance is ≤ 3, we flag it as too similar. The algorithm uses a two-row rolling DP table so it runs in O(n) space instead of the naive O(n²) matrix.

### 3. Fisher-Yates Shuffle with Rejection Sampling (`src/lib/algorithms/generator.ts`)

Powers the password generator. The naive approach of `Math.random()` has two problems: it's not cryptographically secure, and modulo bias (if you do `rand % 62` for 62 possible characters, some characters get picked slightly more often than others).

We fix both:

- Use `crypto.getRandomValues()` instead of `Math.random()` — this pulls from the OS's cryptographically secure random number generator.
- Apply **rejection sampling**: generate a random 32-bit integer, discard it if it falls in the biased tail, and retry. This ensures every character in the pool has exactly equal probability.

The Fisher-Yates shuffle then rearranges the final array in a way that's provably uniformly random — every possible arrangement is equally likely.

---

## Roles & Access Control

SafePass has three roles:

| Role | Can Do |
|------|--------|
| `SUPER_ADMIN` | Everything — manage policies, invite managers, see all vault entries |
| `MANAGER` | Manage team vault entries, invite employees, enforce policies |
| `EMPLOYEE` | Access their own vault entries only |

Access control is enforced in two places: middleware (route-level) and API routes (data-level). A manager cannot escalate someone to SUPER_ADMIN, and cannot invite other managers.

---

## Password Policy Engine

Admins/Managers can define organization-wide rules:

- Minimum length
- Require uppercase, lowercase, digits, symbols
- Minimum entropy threshold (in bits)
- Banned password list (checked via Levenshtein)
- Maximum age (force rotation after N days)

These rules are evaluated in the browser using our custom algorithms, so you get instant feedback before even hitting Submit.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Prisma 7 |
| Auth | NextAuth v5 (JWT sessions) |
| Crypto | Web Crypto API (native browser, no libraries) |
| UI Components | Shadcn v4 + Base UI |
| Animations | Framer Motion |
| State | Zustand (vault key), TanStack Query (server state) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # login, register, invite accept pages
│   ├── (dashboard)/     # vault, policy, dashboard pages
│   └── api/             # REST endpoints
├── components/
│   ├── common/          # Sidebar, Topbar, ThemeToggle, Providers
│   ├── features/        # VaultClient, PolicyClient, MasterUnlockModal, etc.
│   └── ui/              # Shadcn primitives (Button, Input, Dialog, etc.)
├── lib/
│   ├── algorithms/
│   │   ├── entropy.ts       # Shannon entropy implementation
│   │   ├── levenshtein.ts   # Edit distance + banned word checker
│   │   └── generator.ts     # Fisher-Yates + rejection sampling
│   ├── crypto.ts            # PBKDF2 key derivation + AES-GCM encrypt/decrypt
│   ├── auth.ts              # NextAuth config + JWT callbacks
│   └── theme.ts             # Theme system (light/dark/system)
└── store/
    └── vaultStore.ts        # Ephemeral CryptoKey store (never persisted)
```

---

## What's Built

- [x] User authentication (register, login, JWT sessions)
- [x] Team invitation system with tokenized invite links
- [x] Master Password setup + PBKDF2 key derivation
- [x] AES-256-GCM vault encryption/decryption (client-side only)
- [x] Vault CRUD (add, view, delete entries)
- [x] Shannon entropy strength meter
- [x] Levenshtein banned-word checker
- [x] Cryptographically secure password generator
- [x] Password policy configuration (admin/manager)
- [x] Role-based access control (SUPER_ADMIN / MANAGER / EMPLOYEE)
- [x] Light / Dark / System theme with zero flash on load
- [x] Audit log model (schema ready)

## What's Coming

- [ ] Audit log UI — see who accessed/changed what and when
- [ ] Vault entry sharing between team members (still E2EE)
- [ ] Password expiry notifications + rotation reminders
- [ ] Browser extension for autofill
- [ ] TOTP / 2FA support
- [ ] Export vault (encrypted backup file)
- [ ] SSO / SAML integration for enterprise orgs

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in DATABASE_URL and generate AUTH_SECRET:
npx auth secret

# 3. Run database migrations
npx prisma migrate dev

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register the first account — it becomes SUPER_ADMIN automatically.

---

## Security Notes

- The Master Password is **never sent to the server**, not even hashed. Only a random PBKDF2 salt is stored.
- The derived `CryptoKey` is marked `extractable: false` — it cannot be serialized or exported, even by the JavaScript running on the page.
- The CryptoKey lives only in the Zustand store (JavaScript heap). It is gone on page refresh by design. You re-enter your Master Password to re-derive it.
- There is no server endpoint that can decrypt vault entries. This is structural, not just a policy.
