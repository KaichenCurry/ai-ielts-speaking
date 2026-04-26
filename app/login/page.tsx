import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { GuestSignInButton } from "@/components/auth/guest-sign-in-button";
import { getServerUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getServerUser();

  // Already-authed real users bounce to the homepage so they make their own
  // next move (browse / start mock / view reports). Anonymous users land
  // here on purpose (to upgrade) — let them stay.
  if (user && !user.is_anonymous) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="auth-heading">
          <p className="eyebrow">百科口语 · ACCESS</p>
          <h1 className="auth-title">登录后开始本期模考</h1>
          <p className="auth-description">
            模考、评分结果和报告记录都与账号绑定 · 也可以先用访客模式试一下
          </p>
        </div>
        <Suspense fallback={<div className="auth-form-fallback">载入中…</div>}>
          <AuthForm mode="login" />
        </Suspense>
        <div className="auth-divider"><span>或</span></div>
        <GuestSignInButton variant="ghost" label="继续为访客 · 无需注册" />
      </section>
    </main>
  );
}
