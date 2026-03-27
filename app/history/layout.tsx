import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function HistoryLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login?next=/history");
  }

  return <>{children}</>;
}
