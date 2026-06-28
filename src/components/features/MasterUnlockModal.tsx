"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, KeyRound, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useVaultStore } from "@/store/vaultStore";
import { deriveKey } from "@/lib/crypto";
import { cn } from "@/lib/utils";

export function MasterUnlockModal() {
  const { isUnlockModalOpen, closeUnlockModal, setDerivedKey, pendingActionAfterUnlock } =
    useVaultStore();

  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!masterPassword.trim()) {
      setError("Please enter your Master Password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch the user's salt from the server
      const res = await fetch("/api/user/master-key");
      if (!res.ok) throw new Error("Failed to fetch vault salt.");

      const { masterKeySalt } = await res.json();
      if (!masterKeySalt) {
        setError("Master key not set up. Please set up your vault first.");
        setIsLoading(false);
        return;
      }

      // 2. Derive the AES key in the browser — never touches the network
      const derivedKey = await deriveKey(masterPassword, masterKeySalt);

      // 3. Store in Zustand, clear sensitive variable
      setDerivedKey(derivedKey);
      setMasterPassword("");

      toast.success("Vault unlocked", {
        description: "Master key loaded into memory.",
        icon: "🔓",
      });

      // 4. Run any pending action that triggered this unlock
      pendingActionAfterUnlock?.();
    } catch (err) {
      console.error(err);
      // Be deliberately vague to avoid oracle attacks
      setError("Failed to unlock vault. Please verify your Master Password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMasterPassword("");
    setError(null);
    closeUnlockModal();
  };

  return (
    <Dialog open={isUnlockModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-border shadow-2xl shadow-black/50">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Unlock Vault</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Enter your Master Password to decrypt credentials.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Your Master Password never leaves this device. It derives the decryption key locally.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="master-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Master Password
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="master-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your Master Password"
                  value={masterPassword}
                  onChange={(e) => {
                    setMasterPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className={cn(
                    "pl-9 pr-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                    error && "border-destructive"
                  )}
                  autoFocus
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
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-border/50"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleUnlock}
                disabled={isLoading || !masterPassword.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Deriving key…
                  </span>
                ) : (
                  "Unlock"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
