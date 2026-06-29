"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck, Plus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const policySchema = z.object({
  minLength: z.number().int().min(8).max(128),
  maxLength: z.number().int().min(12).max(256),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSymbols: z.boolean(),
  banSimilarWords: z.boolean(),
  bannedWords: z.array(z.string().max(50)).max(100),
  minEntropyBits: z.number().min(0).max(256),
  passwordExpiry: z.number().int().min(1).max(365).nullable(),
});

type PolicyForm = z.infer<typeof policySchema>;

interface Props {
  policy: PolicyForm & { id?: string } | null;
  orgName: string;
  role: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function PolicyClient({ policy, orgName, role }: Props) {
  const [newBannedWord, setNewBannedWord] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors, isDirty } } =
    useForm<PolicyForm>({
      resolver: zodResolver(policySchema),
      defaultValues: policy ?? {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        banSimilarWords: true,
        bannedWords: [],
        minEntropyBits: 60,
        passwordExpiry: null,
      },
    });

  const bannedWords = watch("bannedWords");

  const addBannedWord = () => {
    const word = newBannedWord.trim().toLowerCase();
    if (!word || bannedWords.includes(word)) return;
    setValue("bannedWords", [...bannedWords, word], { shouldDirty: true });
    setNewBannedWord("");
  };

  const removeBannedWord = (word: string) => {
    setValue("bannedWords", bannedWords.filter((w) => w !== word), { shouldDirty: true });
  };

  const onSubmit = async (data: PolicyForm) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Save failed");
      }

      toast.success("Policy updated", {
        description: "Changes will apply to all new vault entries.",
        icon: "🛡️",
      });
    } catch (err: unknown) {
      toast.error("Failed to save policy", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const SwitchField = ({
    name,
    label,
    description,
  }: {
    name: keyof PolicyForm;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            disabled={role === "EMPLOYEE"}
          />
        )}
      />
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Password Policy</h2>
          <p className="text-xs text-muted-foreground">{orgName}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto text-xs",
            role === "SUPER_ADMIN"
              ? "text-violet-400 border-violet-400/30"
              : "text-blue-400 border-blue-400/30"
          )}
        >
          {role === "SUPER_ADMIN" ? "Super Admin" : "Manager"}
        </Badge>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Length */}
        <motion.div variants={item} className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Length Requirements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["minLength", "maxLength"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {field === "minLength" ? "Min Length" : "Max Length"}
                </Label>
                <Controller
                  control={control}
                  name={field}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      min={field === "minLength" ? 8 : 12}
                      max={field === "minLength" ? 128 : 256}
                      value={f.value as number}
                      onChange={(e) => f.onChange(parseInt(e.target.value, 10))}
                      className={cn(
                        "bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                        errors[field] && "border-destructive"
                      )}
                    />
                  )}
                />
                {errors[field] && (
                  <p className="text-xs text-destructive">{errors[field]?.message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Min entropy */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Minimum Entropy (bits)
            </Label>
            <Controller
              control={control}
              name="minEntropyBits"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>0 bits</span>
                    <span className="font-medium text-foreground">{field.value} bits</span>
                    <span>128 bits</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={128}
                    step={1}
                    value={field.value as number}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>60 bits recommended · 80+ bits for high-security vaults</span>
                  </div>
                </div>
              )}
            />
          </div>
        </motion.div>

        {/* Character Requirements */}
        <motion.div variants={item} className="glass rounded-xl p-5 space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Character Requirements
          </h3>
          <SwitchField name="requireUppercase" label="Require Uppercase Letters" description="At least one A–Z character" />
          <Separator className="bg-border/30" />
          <SwitchField name="requireLowercase" label="Require Lowercase Letters" description="At least one a–z character" />
          <Separator className="bg-border/30" />
          <SwitchField name="requireNumbers" label="Require Numbers" description="At least one digit 0–9" />
          <Separator className="bg-border/30" />
          <SwitchField name="requireSymbols" label="Require Special Symbols" description="At least one !@#$%^&* etc." />
        </motion.div>

        {/* Dictionary & Levenshtein */}
        <motion.div variants={item} className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Dictionary & Similarity
          </h3>
          <SwitchField
            name="banSimilarWords"
            label="Ban Similar Words (Levenshtein ≤ 3)"
            description="Flags passwords too close to banned dictionary words using edit-distance analysis"
          />

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Custom Banned Words
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a word…"
                value={newBannedWord}
                onChange={(e) => setNewBannedWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBannedWord())}
                className="bg-muted/50 border-border/50 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addBannedWord} className="border-border/50">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {bannedWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {bannedWords.map((word) => (
                  <span
                    key={word}
                    className="flex items-center gap-1 text-xs bg-muted/60 border border-border/50 rounded px-2 py-0.5"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => removeBannedWord(word)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Save button */}
        <motion.div variants={item} className="flex justify-end">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-32"
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              "Save Policy"
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
