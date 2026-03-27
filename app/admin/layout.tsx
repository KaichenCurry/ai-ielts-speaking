import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/practice");
  }

  return <>{children}</>;
}
