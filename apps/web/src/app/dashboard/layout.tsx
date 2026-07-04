import { AuthProvider } from "@/components/auth/auth-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireUser } from "@/lib/auth/require-user";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AuthProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <main className="relative flex min-h-svh flex-1 flex-col bg-background">
          {children}
        </main>
      </SidebarProvider>
    </AuthProvider>
  );
}