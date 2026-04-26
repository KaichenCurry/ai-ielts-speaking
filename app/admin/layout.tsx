import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdminEmail(user.email)) {
    // /practice was deleted in the relaunch; send non-admins back to the
    // public homepage. (proxy.ts also enforces this — kept here as defence
    // in depth for direct-RSC access.)
    redirect("/");
  }

  return <>{children}</>;
}
