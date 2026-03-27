"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSupabaseAuthBrowserClient } from "@/lib/supabase/auth-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isLogin = mode === "login";
  const nextPath = searchParams.get("next") || "/practice";
  const alternateAuthPath = new URLSearchParams(searchParams.toString());
  const alternateModeHref = `${isLogin ? "/register" : "/login"}${alternateAuthPath.toString() ? `?${alternateAuthPath.toString()}` : ""}`;

  function getEmailRedirectTo() {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", nextPath);
    return callbackUrl.toString();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createSupabaseAuthBrowserClient();

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setSuccess("注册成功。请先完成邮箱验证，再返回登录。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>邮箱</span>
        <input
          className="form-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="form-field">
        <span>密码</span>
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder="至少 6 位"
          minLength={6}
          required
        />
      </label>

      <button className="action-button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "提交中..." : isLogin ? "登录" : "注册"}
      </button>

      {error ? <p className="message-error">{error}</p> : null}
      {success ? <p className="message-success">{success}</p> : null}

      <p className="auth-footer">
        {isLogin ? "还没有账号？" : "已有账号？"}
        <Link className="text-link" href={alternateModeHref}>
          {isLogin ? "去注册" : "去登录"}
        </Link>
      </p>
    </form>
  );
}
