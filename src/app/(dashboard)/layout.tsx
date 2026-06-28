import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/common/Sidebar";
import { Topbar } from "@/components/common/Topbar";
import { headers } from "next/headers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  const titleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/vault": "Vault",
    "/vault/new": "New Entry",
    "/vault/setup": "Master Password Setup",
    "/policy": "Password Policy",
  };

  const title = Object.entries(titleMap).find(([path]) => pathname.startsWith(path))?.[1] ?? "SafePass";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          title={title}
          userName={session.user.name}
          userEmail={session.user.email}
          userRole={session.user.role}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
