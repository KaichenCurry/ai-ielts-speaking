import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function ResultSessionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ sessionId: string }>;
}) {
  const user = await getServerUser();

  if (!user) {
    const { sessionId } = await params;
    redirect(`/login?next=/result/${sessionId}`);
  }

  return <>{children}</>;
}
