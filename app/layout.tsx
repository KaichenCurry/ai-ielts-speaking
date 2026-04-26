import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentSeason } from "@/lib/data/papers";
import { getServerUser, getUserDisplayName, isAdminEmail } from "@/lib/supabase/auth-server";
import "./globals.css";

const BRAND_NAME_CN = "百科口语";
const BRAND_NAME_EN = "BaikeSpeaking";
const COPYRIGHT_HOLDER = "深圳百科教育有限公司";

export const metadata: Metadata = {
  title: `${BRAND_NAME_CN} — IELTS 口语全真模考 · ${BRAND_NAME_EN}`,
  description: "按当季题季同步的 IELTS 口语全真模考，整场录音、AI 教练评分、五维反馈 · 深圳百科教育出品",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getServerUser();
  const isAdmin = isAdminEmail(user?.email);
  const displayName = getUserDisplayName(user);
  const season = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Inter:wght@300;400;450;500;550;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Noto+Serif+SC:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="sb-frame">
          <header className="sb-nav">
            <div className="sb-nav-inner">
              <Link href="/" className="sb-brand">
                <span className="sb-brand-mark" aria-hidden>
                  <span className="sb-brand-mark-dot" />
                  <span className="sb-brand-mark-ring" />
                </span>
                <span className="sb-brand-text">
                  <span className="sb-brand-name">{BRAND_NAME_CN}</span>
                  <span className="sb-brand-en">{BRAND_NAME_EN}</span>
                </span>
                <span className="sb-brand-season">· {season.zhLabel}</span>
              </Link>
              <nav className="sb-nav-links">
                <Link href="/" className="sb-nav-link">首页</Link>
                <Link href="/mock" className="sb-nav-link">模考</Link>
                <Link href="/history" className="sb-nav-link">报告</Link>
                {isAdmin ? (
                  <Link href="/admin" className="sb-nav-link sb-nav-link-admin">后台</Link>
                ) : null}
              </nav>
              <div className="sb-nav-end">
                {user ? (
                  user.is_anonymous ? (
                    <>
                      <span className="sb-guest-pill" title="以访客身份登录，记录绑定本浏览器">
                        <span className="sb-guest-pill-dot" />
                        访客模式
                      </span>
                      <Link href="/upgrade" className="sb-btn sb-btn-accent sb-btn-sm">
                        升级账号
                      </Link>
                      <LogoutButton />
                    </>
                  ) : (
                    <>
                      <span
                        className="sb-nav-user"
                        title={user.email ? `${displayName} · ${user.email}` : displayName}
                      >
                        <span className="sb-nav-user-avatar" aria-hidden>
                          {displayName.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="sb-nav-user-name">{displayName}</span>
                      </span>
                      <LogoutButton />
                    </>
                  )
                ) : (
                  <>
                    <Link href="/login" className="sb-nav-link">登录</Link>
                    <Link href="/register" className="sb-btn sb-btn-primary sb-btn-sm">免费注册</Link>
                  </>
                )}
              </div>
            </div>
          </header>
          <div className="sb-main">{children}</div>
          <footer className="sb-foot">
            <div className="sb-foot-inner">
              <div className="sb-foot-grid">
                <div className="sb-foot-col sb-foot-col-brand">
                  <div className="sb-foot-brand">
                    <span className="sb-brand-mark" aria-hidden>
                      <span className="sb-brand-mark-dot" />
                      <span className="sb-brand-mark-ring" />
                    </span>
                    <span>
                      <span className="sb-foot-brand-cn">{BRAND_NAME_CN}</span>
                      <span className="sb-foot-brand-en">{BRAND_NAME_EN}</span>
                    </span>
                  </div>
                  <p className="sb-foot-tagline">
                    按当季题季同步的 IELTS 口语全真模考<br />
                    每 4 个月更新一次题面，与考场节奏并进
                  </p>
                </div>
                <div className="sb-foot-col">
                  <p className="sb-foot-col-title">产品</p>
                  <ul>
                    <li><Link href="/mock">本期试卷</Link></li>
                    <li><Link href="/mock/custom">自选题目</Link></li>
                    <li><Link href="/mock/check">设备检测</Link></li>
                    <li><Link href="/history">我的报告</Link></li>
                  </ul>
                </div>
                <div className="sb-foot-col">
                  <p className="sb-foot-col-title">账号</p>
                  <ul>
                    <li><Link href="/login">登录</Link></li>
                    <li><Link href="/register">免费注册</Link></li>
                    <li><Link href="/upgrade">升级账号</Link></li>
                  </ul>
                </div>
                <div className="sb-foot-col">
                  <p className="sb-foot-col-title">题季</p>
                  <ul>
                    <li><span className="sb-foot-col-current">{season.label}</span></li>
                    <li>
                      <span className="sb-foot-col-muted">
                        {season.startDate.slice(0, 7)} – {season.endDate.slice(0, 7)}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="sb-foot-bar">
                <p className="sb-foot-copyright">
                  © {currentYear} {COPYRIGHT_HOLDER} · 版权所有 · {BRAND_NAME_CN} {BRAND_NAME_EN}
                </p>
                <p className="sb-foot-meta">
                  <span>ICP 备案中</span>
                  <span>·</span>
                  <span>v0.4 · {season.id}</span>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
