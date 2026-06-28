"use client";

import { motion } from "framer-motion";
import { Database, KeyRound, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { categoryIcon, timeAgo } from "@/helpers/format";
import { cn } from "@/lib/utils";

interface Props {
  userName: string;
  role: string;
  stats: { vaultCount: number; teamCount: number; hasPolicy: boolean };
  recentEntries: {
    id: string;
    title: string;
    username: string;
    category: string | null;
    updatedAt: string;
  }[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function DashboardClient({ userName, role, stats, recentEntries }: Props) {
  const firstName = userName.split(" ")[0];

  const metricCards = [
    {
      label: "Vault Entries",
      value: stats.vaultCount,
      icon: KeyRound,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      href: "/vault",
    },
    {
      label: "Team Members",
      value: stats.teamCount,
      icon: Users,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      href: null,
    },
    {
      label: "Policy Status",
      value: stats.hasPolicy ? "Active" : "Not Set",
      icon: ShieldCheck,
      color: stats.hasPolicy ? "text-emerald-400" : "text-yellow-500",
      bg: stats.hasPolicy ? "bg-emerald-400/10" : "bg-yellow-500/10",
      href: "/policy",
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl">
      {/* Greeting */}
      <motion.div variants={item}>
        <h2 className="text-2xl font-semibold tracking-tight">
          Good day, {firstName} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s your organization&apos;s security overview.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/vault/new"
          className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <KeyRound className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Add new credential</p>
            <p className="text-xs text-muted-foreground">Encrypt and store securely</p>
          </div>
        </Link>
        <Link
          href="/vault"
          className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Open vault</p>
            <p className="text-xs text-muted-foreground">View all stored credentials</p>
          </div>
        </Link>
      </motion.div>

      {/* Recent Activity */}
      {recentEntries.length > 0 && (
        <motion.div variants={item} className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm font-medium">Recent Activity</h3>
            <Link href="/vault" className="text-xs text-primary hover:text-primary/80 transition-colors">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border/30">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="data-row px-4 py-3 flex items-center gap-3">
                <span className="text-base">{categoryIcon(entry.category)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.username}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(entry.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  href: string | null;
}) {
  const content = (
    <div className="glass rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}
