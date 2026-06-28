import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MasterPasswordSetupClient } from "@/components/features/MasterPasswordSetupClient";

export default async function VaultSetupPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // If salt already exists, they don't need setup — send them to vault
  if (session.user.masterKeySalt) redirect("/vault");

  return <MasterPasswordSetupClient />;
}
