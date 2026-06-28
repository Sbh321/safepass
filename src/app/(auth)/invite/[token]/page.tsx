"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, ShieldCheck, User, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/helpers/format";
import { computeEntropy, strengthBgColor, strengthColor } from "@/lib/algorithms/entropy";
import { cn } from "@/lib/utils";

const acceptSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Requires an uppercase letter")
    .regex(/[0-9]/, "Requires a number")
    .regex(/[^A-Za-z0-9]/, "Requires a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AcceptForm = z.infer<typeof acceptSchema>;

interface InviteMeta {
  email: string;
  role: string;
  organizationName: string;
  invitedBy: string;
}

type InviteStatus = "loading" | "valid" | "invalid" | "expired" | "used";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [meta, setMeta] = useState<InviteMeta | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptForm>({ resolver: zodResolver(acceptSchema) });

  const watchedPassword = watch("password", "");
  const entropy = computeEntropy(watchedPassword);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (res.status === 404) { setStatus("invalid"); return; }
        if (res.status === 410) {
          const body = await res.json();
          setStatus(body.error?.includes("already") ? "used" : "expired");
          return;
        }
        if (!res.ok) { setStatus("invalid"); return; }
        const data = await res.json();
        setMeta(data);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const onSubmit = async (data: AcceptForm) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, password: data.password }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create account");
      }

      toast.success("Account created!", { description: "Signing you in…" });

      const result = await signIn("credentials", {
        email: meta!.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/dashboard");
      } else {
        toast.info("Account created. Please sign in.", { description: "Redirecting to login…" });
        router.push("/login");
      }
    } catch (err: unknown) {
      toast.error("Failed to accept invitation", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="glass rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl shadow-black/40">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Validating invitation…</p>
      </div>
    );
  }

  if (status !== "valid" || !meta) {
    const messages: Record<string, { title: string; description: string }> = {
      invalid: { title: "Invalid invitation", description: "This invitation link is not valid or does not exist." },
      expired: { title: "Invitation expired", description: "This invitation link has expired. Ask your admin to resend it." },
      used: { title: "Already accepted", description: "This invitation has already been used to create an account." },
    };
    const msg = messages[status] ?? messages.invalid;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-8 shadow-2xl shadow-black/40 text-center space-y-4"
      >
        <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
        <div>
          <h2 className="text-lg font-semibold">{msg.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{msg.description}</p>
        </div>
      </motion.div>
    );
  }

  const role = roleLabel(meta.role);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass rounded-2xl p-8 shadow-2xl shadow-black/40"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">You&apos;re invited</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.invitedBy} invited you to join <span className="text-foreground font-medium">{meta.organizationName}</span>
          </p>
        </div>
      </div>

      {/* Invite meta */}
      <div className="rounded-lg bg-muted/50 border border-border/50 px-4 py-3 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Invited email</p>
          <p className="text-sm font-medium">{meta.email}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", role.className)}>
          {role.label}
        </Badge>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Jane Smith"
              className={cn(
                "pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                errors.name && "border-destructive"
              )}
              {...register("name")}
            />
          </div>
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Create Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 12 chars with symbols"
              className={cn(
                "pl-9 pr-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                errors.password && "border-destructive"
              )}
              {...register("password")}
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
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}

          {/* Entropy meter */}
          <AnimatePresence>
            {watchedPassword.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={strengthColor(entropy.label)}>{entropy.label}</span>
                  <span className="text-muted-foreground">{entropy.bits.toFixed(1)} bits</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", strengthBgColor(entropy.label))}
                    animate={{ width: `${entropy.score}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat your password"
              className={cn(
                "pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                errors.confirmPassword && "border-destructive"
              )}
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creating account…
            </span>
          ) : (
            "Accept Invitation & Join"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
