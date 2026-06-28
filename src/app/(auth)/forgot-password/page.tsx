"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({ email: z.string().email("Invalid email address") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (_data: Form) => {
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Reset link sent", {
      description: "If that email exists, you'll receive a reset link.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass rounded-2xl p-8 shadow-2xl shadow-black/40"
    >
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>
      </div>

      {isSubmitSuccessful ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Check your inbox. The reset link expires in 15 minutes.
          </p>
          <Link href="/login" className="text-sm text-primary hover:text-primary/80 transition-colors">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Work Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className={cn(
                  "pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                  errors.email && "border-destructive"
                )}
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Sending…
              </span>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <Link
            href="/login"
            className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to sign in
          </Link>
        </form>
      )}
    </motion.div>
  );
}
