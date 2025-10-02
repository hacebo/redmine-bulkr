import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/services/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();
  
  // Authentication is handled by middleware, so we can assume user exists here
  if (!user) {
    // Fallback redirect if middleware somehow missed this
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar user={{ email: user.email!, name: user.name || user.email }} />
        <main className="flex-1">
          <div className="border-b px-4 py-2">
            <SidebarTrigger />
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
