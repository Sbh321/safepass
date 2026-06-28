import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/features/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [vaultCount, teamCount, policy] = await Promise.all([
    prisma.vaultEntry.count({ where: { organizationId: session.user.organizationId } }),
    prisma.user.count({ where: { organizationId: session.user.organizationId } }),
    prisma.passwordPolicy.findUnique({
      where: { organizationId: session.user.organizationId },
    }),
  ]);

  const recentEntries = await prisma.vaultEntry.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, username: true, category: true, updatedAt: true },
  });

  return (
    <DashboardClient
      userName={session.user.name ?? session.user.email}
      role={session.user.role}
      stats={{ vaultCount, teamCount, hasPolicy: !!policy }}
      recentEntries={recentEntries.map((e: typeof recentEntries[0]) => ({
        ...e,
        updatedAt: e.updatedAt.toISOString(),
      }))}
    />
  );
}
