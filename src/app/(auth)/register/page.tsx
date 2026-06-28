"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import { Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  organization: z.string().min(2, "Organization name must be at least 2 characters"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          organizationName: data.organization,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error("Registration failed", { description: body.error ?? "Unknown error" });
        return;
      }

      toast.success("Account created!", {
        description: "Please sign in to continue.",
      });
      router.push("/login");
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { id: "name", label: "Full Name", type: "text", placeholder: "Jane Smith", icon: User },
    { id: "email", label: "Work Email", type: "email", placeholder: "jane@company.com", icon: Mail },
    { id: "organization", label: "Organization", type: "text", placeholder: "Acme Corp", icon: Building2 },
  ] as const;

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
          <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your organization vault</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {fields.map(({ id, label, type, placeholder, icon: Icon }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </Label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id={id}
                type={type}
                placeholder={placeholder}
                className={cn(
                  "pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors",
                  errors[id] && "border-destructive"
                )}
                {...register(id)}
              />
            </div>
            {errors[id] && <p className="text-xs text-destructive">{errors[id]?.message}</p>}
          </div>
        ))}

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Password
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
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creating account…
            </span>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
