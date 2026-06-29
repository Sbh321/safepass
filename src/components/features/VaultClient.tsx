"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Plus, Search, Trash2, Copy, RefreshCw, Lock, KeyRound,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MasterUnlockModal } from "@/components/features/MasterUnlockModal";
import { useVaultStore } from "@/store/vaultStore";
import { decryptSecret } from "@/lib/crypto";
import { categoryIcon, timeAgo } from "@/helpers/format";
import { cn } from "@/lib/utils";

interface VaultEntry {
  id: string;
  title: string;
  username: string;
  encryptedSecret: string;
  iv: string;
  notes: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export function VaultClient({ initialEntries }: { initialEntries: VaultEntry[] }) {
  const { derivedKey, openUnlockModal } = useVaultStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [decryptedSecrets, setDecryptedSecrets] = useState<Record<string, string>>({});

  const { data: entries = initialEntries } = useQuery<VaultEntry[]>({
    queryKey: ["vault-entries"],
    queryFn: async () => {
      const res = await fetch("/api/vault");
      if (!res.ok) throw new Error("Failed to fetch vault");
      return res.json();
    },
    initialData: initialEntries,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-entries"] });
      toast.success("Entry deleted");
    },
    onError: () => toast.error("Failed to delete entry"),
  });

  const handleRevealPassword = useCallback(
    async (entry: VaultEntry) => {
      if (revealedIds.has(entry.id)) {
        setRevealedIds((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
        return;
      }

      if (!derivedKey) {
        openUnlockModal(() => handleRevealPassword(entry));
        return;
      }

      if (decryptedSecrets[entry.id]) {
        setRevealedIds((prev) => new Set(prev).add(entry.id));
        return;
      }

      try {
        const plaintext = await decryptSecret(derivedKey, {
          ciphertext: entry.encryptedSecret,
          iv: entry.iv,
        });
        setDecryptedSecrets((prev) => ({ ...prev, [entry.id]: plaintext }));
        setRevealedIds((prev) => new Set(prev).add(entry.id));
      } catch {
        toast.error("Decryption failed", {
          description: "The key may be incorrect. Try locking and unlocking the vault.",
        });
      }
    },
    [derivedKey, revealedIds, decryptedSecrets, openUnlockModal]
  );

  const handleCopyPassword = useCallback(
    async (entry: VaultEntry) => {
      if (!derivedKey) {
        openUnlockModal(() => handleCopyPassword(entry));
        return;
      }

      try {
        let secret = decryptedSecrets[entry.id];
        if (!secret) {
          secret = await decryptSecret(derivedKey, {
            ciphertext: entry.encryptedSecret,
            iv: entry.iv,
          });
          setDecryptedSecrets((prev) => ({ ...prev, [entry.id]: secret }));
        }
        await navigator.clipboard.writeText(secret);
        toast.success("Copied to clipboard", {
          description: "Password copied. Clipboard clears after 30s.",
          duration: 3000,
        });
        setTimeout(() => navigator.clipboard.writeText(""), 30_000);
      } catch {
        toast.error("Copy failed");
      }
    },
    [derivedKey, decryptedSecrets, openUnlockModal]
  );

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase()) ||
      (e.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <MasterUnlockModal />

      <div className="space-y-4 max-w-6xl">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search credentials…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50 border-border/50 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!derivedKey && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border/50 text-xs"
                onClick={() => openUnlockModal()}
              >
                <Lock className="w-3.5 h-3.5" />
                Unlock Vault
              </Button>
            )}
            <Link
              href="/vault/new"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Entry
            </Link>
          </div>
        </div>

        {/* Vault status pill */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
            derivedKey
              ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
              : "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
          )}>
            {derivedKey ? (
              <><KeyRound className="w-3 h-3" /> Unlocked — {filtered.length} entries</>
            ) : (
              <><Lock className="w-3 h-3" /> Vault locked — unlock to reveal passwords</>
            )}
          </span>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          {/* Header — desktop only */}
          <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border/50 bg-muted/30">
            {["Title", "Username", "Category", "Updated", ""].map((h) => (
              <span key={h} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <KeyRound className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {search ? "No credentials match your search." : "No credentials yet."}
              </p>
              {!search && (
                <Link
                  href="/vault/new"
                  className="inline-flex items-center h-7 px-2.5 rounded-lg text-xs font-medium border border-border/50 bg-transparent hover:bg-muted transition-colors mt-2"
                >
                  Add your first credential
                </Link>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((entry, i) => (
                <VaultRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  isRevealed={revealedIds.has(entry.id)}
                  decryptedSecret={decryptedSecrets[entry.id]}
                  onReveal={() => handleRevealPassword(entry)}
                  onCopy={() => handleCopyPassword(entry)}
                  onDelete={() => {
                    if (confirm(`Delete "${entry.title}"?`)) {
                      deleteMutation.mutate(entry.id);
                    }
                  }}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}

function VaultRow({
  entry,
  index,
  isRevealed,
  decryptedSecret,
  onReveal,
  onCopy,
  onDelete,
  isDeleting,
}: {
  entry: VaultEntry;
  index: number;
  isRevealed: boolean;
  decryptedSecret?: string;
  onReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const actions = (size: "sm" | "md") => (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onReveal}
        className={cn(
          "flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors",
          size === "md" ? "w-8 h-8" : "w-7 h-7"
        )}
        title={isRevealed ? "Hide password" : "Reveal password"}
      >
        {isRevealed
          ? <EyeOff className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
          : <Eye className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />}
      </button>
      <button
        onClick={onCopy}
        className={cn(
          "flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors",
          size === "md" ? "w-8 h-8" : "w-7 h-7"
        )}
        title="Copy password"
      >
        <Copy className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      </button>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className={cn(
          "flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
          size === "md" ? "w-8 h-8" : "w-7 h-7"
        )}
        title="Delete entry"
      >
        <Trash2 className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className="data-row"
    >
      {/* Mobile card layout */}
      <div className="sm:hidden px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-base shrink-0 mt-0.5">{categoryIcon(entry.category)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{entry.title}</p>
              <div className="shrink-0">{actions("md")}</div>
            </div>
            <AnimatePresence mode="wait">
              {isRevealed && decryptedSecret ? (
                <motion.p key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs font-mono text-emerald-400 truncate mt-0.5">
                  {decryptedSecret}
                </motion.p>
              ) : (
                <motion.p key="masked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs font-mono text-muted-foreground/50 tracking-widest mt-0.5">
                  {"•".repeat(12)}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-xs text-muted-foreground truncate">{entry.username}</p>
              {entry.category && (
                <>
                  <span className="text-muted-foreground/30 text-xs">·</span>
                  <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground px-1.5 py-0">
                    {entry.category}
                  </Badge>
                </>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{timeAgo(entry.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop table row */}
      <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center">
        {/* Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base shrink-0">{categoryIcon(entry.category)}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{entry.title}</p>
            <AnimatePresence mode="wait">
              {isRevealed && decryptedSecret ? (
                <motion.p key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs font-mono text-emerald-400 truncate">
                  {decryptedSecret}
                </motion.p>
              ) : (
                <motion.p key="masked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs font-mono text-muted-foreground/50 tracking-widest">
                  {"•".repeat(12)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Username */}
        <p className="text-xs text-muted-foreground truncate">{entry.username}</p>

        {/* Category */}
        {entry.category ? (
          <Badge variant="outline" className="text-[10px] w-fit border-border/50 text-muted-foreground">
            {entry.category}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}

        {/* Updated */}
        <span className="text-xs text-muted-foreground">{timeAgo(entry.updatedAt)}</span>

        {/* Actions */}
        {actions("sm")}
      </div>
    </motion.div>
  );
}
