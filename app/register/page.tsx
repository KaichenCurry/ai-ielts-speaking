import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function RegisterPage() {
  const user = await getServerUser();

  if (user) {
    redirect("/practice");
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div className="auth-heading">
          <p className="eyebrow">SpeakAI Access</p>
          <h1 className="auth-title">创建你的练习账号</h1>
          <p className="auth-description">
            注册后才能录音练习、查看自己的历史记录。后台治理内容仅管理员可见。
          </p>
        </div>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
