"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearStoredResultsFromBrowser } from "@/lib/result-storage";
import { createSupabaseAuthBrowserClient } from "@/lib/supabase/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseAuthBrowserClient();
      await supabase.auth.signOut();
      clearStoredResultsFromBrowser();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button className="action-button ghost" type="button" onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "退出中..." : "退出登录"}
    </button>
  );
}
