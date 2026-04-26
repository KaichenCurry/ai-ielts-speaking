import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { GuestSignInButton } from "@/components/auth/guest-sign-in-button";
import { getServerUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getServerUser();

  // Anonymous user wants to register → push them to /upgrade so their
  // existing attempts stay attached to the same user.id.
  if (user?.is_anonymous) {
    redirect("/upgrade");
  }
  // Already-authed real users go back to the homepage to make their own
  // next move; the homepage CTAs route from there.
  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="auth-heading">
          <p className="eyebrow">百科口语 · 新用户注册</p>
          <h1 className="auth-title">创建你的模考账号</h1>
          <p className="auth-description">
            注册后报告会保存到你的账号，跨设备可看 · 也可以先以访客身份试一下
          </p>
        </div>
        <Suspense fallback={<div className="auth-form-fallback">载入中…</div>}>
          <AuthForm mode="register" />
        </Suspense>
        <div className="auth-divider"><span>或</span></div>
        <GuestSignInButton variant="ghost" label="先以访客身份试一下" />
      </section>
    </main>
  );
}
