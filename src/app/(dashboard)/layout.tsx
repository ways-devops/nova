import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar userName={user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="safe-top flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
