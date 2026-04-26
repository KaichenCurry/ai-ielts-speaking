"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseAuthBrowserClient } from "@/lib/supabase/auth-client";

/**
 * Upgrade an anonymous (guest) Supabase user into a real account by
 * attaching an email + password. The user.id stays the same, so all
 * mock_attempts / practice_sessions remain owned by them.
 *
 * Steps internally:
 *   1. supabase.auth.updateUser({ email })            — sends confirmation
 *      email if email confirmations are required by your project.
 *   2. supabase.auth.updateUser({ password })         — sets a password.
 * If your Supabase project requires email confirmation, the email step
 * will return successfully but the new email isn't usable until the user
 * clicks the link from their inbox.
 */
export function UpgradeAccountForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const trimmedNickname = nickname.trim();
      if (trimmedNickname.length < 2) {
        throw new Error("昵称至少 2 个字符");
      }
      if (trimmedNickname.length > 24) {
        throw new Error("昵称最多 24 个字符");
      }

      const supabase = createSupabaseAuthBrowserClient();
      const { data: emailUpdate, error: emailError } = await supabase.auth.updateUser({
        email,
        password,
        data: {
          nickname: trimmedNickname,
          full_name: trimmedNickname,
        },
      });
      if (emailError) {
        throw emailError;
      }
      if (emailUpdate.user?.email_confirmed_at) {
        setSuccess("升级成功！现在你的报告可以跨设备同步");
      } else {
        setSuccess(
          "我们已发送一封验证邮件到 " +
            email +
            "请在邮箱中点击确认链接，之后即可用邮箱+密码在任何设备登录",
        );
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "升级失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="sb-upgrade-form" onSubmit={handleSubmit}>
      <label className="sb-upgrade-field">
        <span>昵称</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          placeholder="给你的口语账号起个名字"
        />
      </label>
      <label className="sb-upgrade-field">
        <span>邮箱</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>
      <label className="sb-upgrade-field">
        <span>新密码（≥ 8 位）</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="至少 8 位"
        />
      </label>

      {error ? <p className="sb-upgrade-error">{error}</p> : null}
      {success ? <p className="sb-upgrade-success">{success}</p> : null}

      <div className="sb-upgrade-actions">
        <button type="submit" className="sb-btn sb-btn-accent sb-btn-lg" disabled={isSubmitting}>
          {isSubmitting ? "正在升级…" : "升级为正式账号"}
        </button>
        <Link href="/mock" className="sb-btn sb-btn-ghost sb-btn-lg">
          稍后再说
        </Link>
      </div>
    </form>
  );
}
