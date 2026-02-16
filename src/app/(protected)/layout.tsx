import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser, getProfile } from "@/lib/auth";
import { TabBar } from "@/components/TabBar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { LeftNavDrawer } from "@/components/LeftNavDrawer";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile?.status || !profile?.expiry_date) {
    redirect("/onboarding");
  }

  return (
    <main className="app-shell">
      <LeftNavDrawer />
      <div className="app-layout">
        <LeftSidebar />
        <section className="app-content with-tabbar">{children}</section>
      </div>
      <TabBar />
    </main>
  );
}
