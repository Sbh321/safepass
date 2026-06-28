"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useVaultStore } from "@/store/vaultStore";
import { generateSalt, deriveKey } from "@/lib/crypto";
import { computeEntropy, strengthBgColor, strengthColor } from "@/lib/algorithms/entropy";
import { cn } from "@/lib/utils";

export function MasterPasswordSetupClient() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { setDerivedKey } = useVaultStore();

  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const entropy = computeEntropy(masterPassword);

  const handleSetup = async () => {
    if (!masterPassword) {
      toast.error("Please enter a Master Password.");
      return;
    }
    if (masterPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (entropy.score < 40) {
      toast.error("Master Password is too weak.", {
        description: "Use at least 12 characters with mixed symbols, numbers, and letters.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Generate a cryptographically random salt — ONLY the salt goes to the server
      const salt = generateSalt();

      // 2. Derive the AES-256-GCM key in the browser
      const derivedKey = await deriveKey(masterPassword, salt);

      // 3. Send ONLY the salt to the server — Master Password never leaves this device
      const res = await fetch("/api/user/master-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKeySalt: salt }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to save salt.");
      }

      // 4. Store the derived key in Zustand (in-memory only)
      setDerivedKey(derivedKey);

      // 5. Force a JWT refresh so session.user.masterKeySalt reflects the new value.
      // Without this, the old token (with masterKeySalt: null) stays alive and the
      // vault page would redirect back to /vault/setup on next server-side render.
      await updateSession({ masterKeySalt: salt });

      toast.success("Vault initialized!", {
        description: "Your Master Password has been set up. The key is loaded into memory.",
        icon: "🔐",
      });

      router.push("/vault");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Setup failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Set Up Your Master Password</h2>
            <p className="text-xs text-muted-foreground">One-time setup. This cannot be recovered.</p>
          </div>
        </div>
      </motion.div>

      {/* E2EE Notice */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-xl p-4 flex items-start gap-3"
      >
        <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Zero-Knowledge Architecture</p>
          <p className="text-xs text-muted-foreground">
            Your Master Password is <span className="text-foreground font-medium">never sent to the server</span>.
            It is used locally to derive an AES-256-GCM encryption key via PBKDF2 (310,000 iterations).
            Only a random salt is stored — if you forget your Master Password, your vault data <span className="text-foreground font-medium">cannot be recovered</span>.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-6 space-y-5"
      >
        {/* Master Password */}
        <div className="space-y-2">
          <Label htmlFor="mp" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Master Password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="mp"
              type={showPassword ? "text" : "password"}
              placeholder="Choose a strong Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="pl-9 pr-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Entropy Meter */}
          <AnimatePresence>
            {masterPassword.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-medium", strengthColor(entropy.label))}>
                    {entropy.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entropy.bits.toFixed(1)} bits · crack time: {entropy.crackTimeDisplay}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", strengthBgColor(entropy.label))}
                    initial={{ width: 0 }}
                    animate={{ width: `${entropy.score}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {entropy.suggestions.length > 0 && (
                  <ul className="space-y-0.5">
                    {entropy.suggestions.slice(0, 3).map((s) => (
                      <li key={s} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm-mp" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Confirm Master Password
          </Label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirm-mp"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat your Master Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                "pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors font-mono",
                confirmPassword && confirmPassword !== masterPassword && "border-destructive"
              )}
            />
          </div>
          {confirmPassword && confirmPassword !== masterPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button
          onClick={handleSetup}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          disabled={isLoading || !masterPassword || masterPassword !== confirmPassword}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Deriving key via PBKDF2…
            </span>
          ) : (
            "Initialize Vault"
          )}
        </Button>
      </motion.div>
    </div>
  );
}
