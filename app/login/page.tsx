import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function LoginPage() {
  const user = await getServerUser();

  if (user) {
    redirect("/practice");
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="auth-heading">
          <p className="eyebrow">SpeakAI Access</p>
          <h1 className="auth-title">登录后开始练习</h1>
          <p className="auth-description">
            练习、评分结果和历史记录都与账号绑定。未登录用户不能进入学生端或后台。
          </p>
        </div>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
