import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI IELTS Speaking MVP",
  description: "Web skeleton for the AI IELTS speaking practice and review platform.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-frame">
          <header className="topbar">
            <Link href="/" className="brand">
              AI IELTS Speaking MVP
            </Link>
            <nav className="topnav">
              <Link href="/practice">学生端</Link>
              <Link href="/history">历史记录</Link>
              <Link href="/admin">后台治理端</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
