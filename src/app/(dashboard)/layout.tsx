import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardShell } from "@/components/common/DashboardShell";

// Ordered longest-first so "/vault/new" matches before "/vault"
const TITLE_MAP: [string, string][] = [
  ["/vault/setup", "Master Password Setup"],
  ["/vault/new", "New Entry"],
  ["/vault", "Vault"],
  ["/policy", "Password Policy"],
  ["/dashboard", "Dashboard"],
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/dashboard";

  const title = TITLE_MAP.find(([path]) => pathname.startsWith(path))?.[1] ?? "SafePass";

  return (
    <DashboardShell
      role={session.user.role}
      title={title}
      userName={session.user.name}
      userEmail={session.user.email}
      userRole={session.user.role}
    >
      {children}
    </DashboardShell>
  );
}
