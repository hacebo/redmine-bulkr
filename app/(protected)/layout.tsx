import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUserForPage } from "@/lib/auth.server";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Force dynamic rendering for all protected pages
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  try {
    const user = await requireUserForPage();
    
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar user={{ email: user.email || '', name: user.email || '' }} />
          <main className="flex-1">
            <div className="border-b px-4 py-2">
              <SidebarTrigger />
            </div>
            <div className="p-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    );
  } catch {
    redirect("/login");
  }
}
