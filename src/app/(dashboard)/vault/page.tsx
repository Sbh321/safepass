import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VaultClient } from "@/components/features/VaultClient";

export default async function VaultPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // If vault not set up yet, redirect to setup
  if (!session.user.masterKeySalt) redirect("/vault/setup");

  const entries = await prisma.vaultEntry.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      username: true,
      encryptedSecret: true,
      iv: true,
      notes: true,
      category: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <VaultClient
      initialEntries={entries.map((e: typeof entries[0]) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }))}
    />
  );
}
