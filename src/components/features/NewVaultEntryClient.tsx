"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye, EyeOff, RefreshCw, Copy, ShieldCheck, KeyRound, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { MasterUnlockModal } from "@/components/features/MasterUnlockModal";
import { useVaultStore } from "@/store/vaultStore";
import { encryptSecret } from "@/lib/crypto";
import { computeEntropy, strengthBgColor, strengthColor } from "@/lib/algorithms/entropy";
import { checkBannedSimilarity, DEFAULT_BANNED_WORDS } from "@/lib/algorithms/levenshtein";
import { generatePassword, DEFAULT_GENERATOR_OPTIONS } from "@/lib/algorithms/generator";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  username: z.string().min(1, "Username is required").max(200),
  password: z.string().min(1, "Password is required"),
  category: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof formSchema>;

const CATEGORIES = ["work", "email", "social", "finance", "cloud", "developer", "vpn", "other"];

interface Props {
  policy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    banSimilarWords: boolean;
    bannedWords: string[];
    minEntropyBits: number;
  } | null;
}

export function NewVaultEntryClient({ policy }: Props) {
  const router = useRouter();
  const { derivedKey, openUnlockModal } = useVaultStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) });

  const watchedPassword = watch("password", "");
  const entropy = computeEntropy(watchedPassword);

  const bannedWords = [
    ...DEFAULT_BANNED_WORDS,
    ...(policy?.bannedWords ?? []),
  ];

  const similarityReport = policy?.banSimilarWords
    ? checkBannedSimilarity(watchedPassword, bannedWords)
    : null;

  const handleGeneratePassword = () => {
    const generated = generatePassword({
      ...DEFAULT_GENERATOR_OPTIONS,
      length: Math.max(policy?.minLength ?? 12, 20),
      includeUppercase: policy?.requireUppercase ?? true,
      includeLowercase: policy?.requireLowercase ?? true,
      includeNumbers: policy?.requireNumbers ?? true,
      includeSymbols: policy?.requireSymbols ?? true,
    });
    setValue("password", generated, { shouldValidate: true });
    setPasswordValue(generated);
  };

  const onSubmit = async (data: FormData) => {
    if (!derivedKey) {
      openUnlockModal(() => handleSubmit(onSubmit)());
      return;
    }

    if (entropy.bits < (policy?.minEntropyBits ?? 0)) {
      toast.error("Password entropy too low", {
        description: `Policy requires at least ${policy?.minEntropyBits} bits. Current: ${entropy.bits.toFixed(1)} bits.`,
      });
      return;
    }

    if (similarityReport?.hasBannedSimilarity) {
      toast.error("Password too similar to a banned word", {
        description: `Closest match: "${similarityReport.closestMatch?.word}" (distance: ${similarityReport.closestMatch?.distance})`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Client-side encryption — server never sees the plaintext
      const { ciphertext, iv } = await encryptSecret(derivedKey, data.password);

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          username: data.username,
          encryptedSecret: ciphertext,
          iv,
          notes: data.notes,
          category: data.category,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Save failed");
      }

      toast.success("Credential saved", {
        description: "Encrypted and stored securely.",
        icon: "🔐",
      });
      router.push("/vault");
    } catch (err: unknown) {
      toast.error("Failed to save", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const policyViolations: string[] = [];
  if (policy) {
    if (watchedPassword.length < policy.minLength)
      policyViolations.push(`Minimum length: ${policy.minLength}`);
    if (policy.requireUppercase && !/[A-Z]/.test(watchedPassword))
      policyViolations.push("Requires uppercase letter");
    if (policy.requireLowercase && !/[a-z]/.test(watchedPassword))
      policyViolations.push("Requires lowercase letter");
    if (policy.requireNumbers && !/[0-9]/.test(watchedPassword))
      policyViolations.push("Requires number");
    if (policy.requireSymbols && !/[^A-Za-z0-9]/.test(watchedPassword))
      policyViolations.push("Requires special character");
  }

  return (
    <>
      <MasterUnlockModal />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            href="/vault"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to vault
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
              <KeyRound className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">New Credential</h2>
              <p className="text-xs text-muted-foreground">
                Encrypted client-side before transmission.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title & Username */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </Label>
                <Input
                  placeholder="e.g. GitHub"
                  className={cn(
                    "bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                    errors.title && "border-destructive"
                  )}
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Username / Email
                </Label>
                <Input
                  placeholder="e.g. john@company.com"
                  className={cn(
                    "bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                    errors.username && "border-destructive"
                  )}
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter or generate a password"
                  className={cn(
                    "pr-18 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors font-mono",
                    errors.password && "border-destructive"
                  )}
                  {...register("password", {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (watchedPassword) {
                        await navigator.clipboard.writeText(watchedPassword);
                        toast.success("Copied");
                      }
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}

              {/* Entropy meter */}
              <AnimatePresence>
                {watchedPassword.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-medium", strengthColor(entropy.label))}>
                        {entropy.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entropy.bits.toFixed(1)} bits · {entropy.crackTimeDisplay} to crack
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", strengthBgColor(entropy.label))}
                        animate={{ width: `${entropy.score}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Policy violations */}
                    {policyViolations.length > 0 && (
                      <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 space-y-0.5">
                        {policyViolations.map((v) => (
                          <p key={v} className="text-xs text-destructive flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-destructive shrink-0" />
                            {v}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Banned word warning */}
                    {similarityReport?.hasBannedSimilarity && (
                      <p className="text-xs text-yellow-500 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                        Too similar to banned word &quot;{similarityReport.closestMatch?.word}&quot;
                        (distance: {similarityReport.closestMatch?.distance})
                      </p>
                    )}

                    {/* All good */}
                    {policyViolations.length === 0 && !similarityReport?.hasBannedSimilarity && entropy.score >= 40 && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" />
                        Passes all policy requirements
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </Label>
              <Select onValueChange={(v: string | null) => setValue("category", v ?? undefined)}>
                <SelectTrigger className="bg-muted/50 border-border/50 text-sm">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes (optional)
              </Label>
              <Textarea
                placeholder="Any additional notes…"
                rows={3}
                className="bg-muted/50 border-border/50 focus:border-primary/50 transition-colors resize-none text-sm"
                {...register("notes")}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-border/50"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Encrypting…
                  </span>
                ) : (
                  "Save Credential"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}
