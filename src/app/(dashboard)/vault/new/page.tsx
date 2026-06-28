import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewVaultEntryClient } from "@/components/features/NewVaultEntryClient";
import { prisma } from "@/lib/prisma";

export default async function NewVaultEntryPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.masterKeySalt) redirect("/vault/setup");

  const policy = await prisma.passwordPolicy.findUnique({
    where: { organizationId: session.user.organizationId },
  });

  return <NewVaultEntryClient policy={policy} />;
}
