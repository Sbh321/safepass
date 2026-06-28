import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PolicyClient } from "@/components/features/PolicyClient";

export default async function PolicyPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const policy = await prisma.passwordPolicy.findUnique({
    where: { organizationId: session.user.organizationId },
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  return (
    <PolicyClient
      policy={policy}
      orgName={org?.name ?? "Your Organization"}
      role={session.user.role}
    />
  );
}
