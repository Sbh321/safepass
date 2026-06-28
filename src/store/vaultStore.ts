/**
 * Vault Zustand Store
 *
 * Holds the in-memory derived AES-256-GCM CryptoKey and vault unlock state.
 * The CryptoKey is NEVER persisted to localStorage or any storage API —
 * it lives only in JavaScript heap memory and is lost on page refresh (by design).
 *
 * This is the cornerstone of the Zero-Knowledge architecture:
 * the server never sees the derived key, and the key is never stored durably.
 */

import { create } from "zustand";

interface VaultState {
  /** The PBKDF2-derived AES-256-GCM key. null means vault is locked. */
  derivedKey: CryptoKey | null;

  /** Whether the master unlock modal is currently shown */
  isUnlockModalOpen: boolean;

  /** Callback to run after successful unlock (used to resume a pending action) */
  pendingActionAfterUnlock: (() => void) | null;

  /** Set the derived key (vault unlocked) */
  setDerivedKey: (key: CryptoKey) => void;

  /** Clear the derived key (vault locked — e.g., manual lock or inactivity) */
  lockVault: () => void;

  /** Open the master unlock modal, optionally with a callback */
  openUnlockModal: (onUnlocked?: () => void) => void;

  /** Close the master unlock modal */
  closeUnlockModal: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  derivedKey: null,
  isUnlockModalOpen: false,
  pendingActionAfterUnlock: null,

  setDerivedKey: (key) =>
    set({
      derivedKey: key,
      isUnlockModalOpen: false,
      pendingActionAfterUnlock: null,
    }),

  lockVault: () =>
    set({
      derivedKey: null,
      isUnlockModalOpen: false,
      pendingActionAfterUnlock: null,
    }),

  openUnlockModal: (onUnlocked) =>
    set({
      isUnlockModalOpen: true,
      pendingActionAfterUnlock: onUnlocked ?? null,
    }),

  closeUnlockModal: () =>
    set({
      isUnlockModalOpen: false,
      pendingActionAfterUnlock: null,
    }),
}));
