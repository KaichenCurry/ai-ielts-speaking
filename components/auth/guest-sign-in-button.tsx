"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSupabaseAuthBrowserClient,
  isSupabaseAuthConfiguredBrowser,
  SupabaseEnvMissingError,
} from "@/lib/supabase/auth-client";

type Props = {
  /** Where to land after a successful guest sign-in. Defaults to /mock. */
  next?: string;
  /** Visual variant — primary / accent / ghost / link */
  variant?: "primary" | "accent" | "ghost" | "link";
  /** Optional label override */
  label?: string;
  /** Extra class names */
  className?: string;
};

/**
 * Continue as guest — calls supabase.auth.signInAnonymously().
 *
 * The resulting user has a real auth.users row with `is_anonymous=true`,
 * so every existing protected API (mock_attempts, /api/score, /api/mock/submit,
 * etc.) works without modification. Visitor can later "升级账号" to attach
 * an email + password without losing any of their attempts.
 *
 * Requires the Supabase project to have **Allow anonymous sign-ins** enabled
 * in Auth → Providers.
 */
export function GuestSignInButton({
  next = "/mock",
  variant = "ghost",
  label = "继续为访客 →",
  className,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setIsSubmitting(true);
    setError("");
    // Pre-flight: surface the most common setup mistake (no .env.local)
    // BEFORE the Supabase SDK throws its own less helpful error.
    if (!isSupabaseAuthConfiguredBrowser()) {
      setError(
        "Supabase 还没有配置请在项目根目录创建 .env.local，填入 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY（参考 .env.example），然后重启 dev server",
      );
      setIsSubmitting(false);
      return;
    }
    try {
      const supabase = createSupabaseAuthBrowserClient();
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        // Most common cause: project hasn't enabled anonymous auth.
        if (signInError.message?.toLowerCase().includes("anonymous")) {
          throw new Error(
            "访客模式未在 Supabase 启用请管理员在 Supabase Dashboard → Authentication → Sign In / Providers → Anonymous Sign-Ins 中开启「Allow anonymous sign-ins」",
          );
        }
        throw signInError;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      console.error(err);
      if (err instanceof SupabaseEnvMissingError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "访客登录失败，请稍后再试");
      }
      setIsSubmitting(false);
    }
  }

  const variantClass =
    variant === "primary"
      ? "sb-btn sb-btn-primary"
      : variant === "accent"
        ? "sb-btn sb-btn-accent"
        : variant === "link"
          ? "sb-guest-link"
          : "sb-btn sb-btn-ghost";

  return (
    <div className="sb-guest-wrap">
      <button
        type="button"
        className={`${variantClass} ${className ?? ""}`.trim()}
        onClick={handleClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? "进入访客模式…" : label}
      </button>
      {error ? <p className="sb-guest-error">{error}</p> : null}
    </div>
  );
}
