import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeakAI — 雅思口语 AI 陪练",
  description: "AI 驱动的雅思口语练习与评分平台",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getServerUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200;12..96,400;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-frame">
          <header className="topbar">
            <Link href={user ? "/practice" : "/login"} className="brand">
              <span className="brand-icon">◈</span>
              SpeakAI
            </Link>
            <div className="topbar-right">
              {user ? (
                <>
                  <nav className="topnav">
                    <Link href="/practice" className="topnav-link">练习</Link>
                    <Link href="/history" className="topnav-link">历史</Link>
                    {isAdmin ? (
                      <Link href="/admin" className="topnav-link topnav-admin">后台</Link>
                    ) : null}
                  </nav>
                  <div className="topbar-account">
                    <span className="topbar-user" title={user.email ?? undefined}>{user.email}</span>
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <div className="topbar-auth">
                  <Link href="/login" className="topnav-link">登录</Link>
                  <Link href="/register" className="link-button secondary">注册</Link>
                </div>
              )}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
