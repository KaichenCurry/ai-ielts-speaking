import Link from "next/link";
import { GuestSignInButton } from "@/components/auth/guest-sign-in-button";
import { getCurrentSeason, listMockPapersWithPreview } from "@/lib/data/papers";

export default async function HomePage() {
  const [papers, season] = await Promise.all([
    listMockPapersWithPreview(),
    Promise.resolve(getCurrentSeason()),
  ]);
  const paperCount = papers.length;
  const yearShort = season.startDate.slice(0, 4);
  const monthsCompact = `${season.startDate.slice(5, 7)}–${season.endDate.slice(5, 7)}`;

  return (
    <div>
      {/* ─────────────────────────────────────────────────────
         HERO — type-driven with aurora bg + serif accent
         ───────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-aurora lp-hero-aurora-1" aria-hidden />
        <div className="lp-hero-aurora lp-hero-aurora-2" aria-hidden />
        <div className="lp-hero-aurora lp-hero-aurora-3" aria-hidden />

        <div className="lp-container lp-hero-inner">
          <p className="lp-supertitle lp-supertitle-brand">
            <span className="lp-supertitle-rule" />
            <span className="lp-supertitle-cn">百科口语</span>
            <span className="lp-supertitle-rule" />
          </p>

          <div className="lp-pill">
            <span className="lp-pill-dot" />
            <span className="lp-pill-mono">{yearShort} · {monthsCompact}月</span>
            <span className="lp-pill-divider" />
            <span>当季新题季 · 同步刷新</span>
          </div>

          <h1 className="lp-headline">
            <span className="lp-headline-line">为真考</span>
            <span className="lp-headline-line">
              而练的<span className="lp-headline-accent">
                口语模考
                <svg
                  className="lp-headline-underline"
                  viewBox="0 0 220 14"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M3,9 Q55,1 110,7 T217,5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>            </span>
          </h1>

          <p className="lp-deck">
            百科口语 · 全真 IELTS 模考 · 一次完整 11–14 分钟<br />
            AI 教练按真考标准评分，整场结束后给出五维诊断报告
          </p>

          <div className="lp-actions">
            <Link href="/mock" className="sb-btn sb-btn-accent sb-btn-lg">
              开始本期模考
            </Link>
            <GuestSignInButton variant="ghost" label="访客模式 · 无需注册" />
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP — quiet supporting numbers ───────── */}
      <section className="lp-strip">
        <div className="lp-container">
          <dl className="lp-strip-grid">
            <div>
              <dt>{paperCount}</dt>
              <dd>当季试卷</dd>
            </div>
            <div>
              <dt>5</dt>
              <dd>评分维度</dd>
            </div>
            <div>
              <dt>11–14<span>min</span></dt>
              <dd>单场用时</dd>
            </div>
            <div>
              <dt>0.5</dt>
              <dd>分数步进</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ─── WHY ──────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <header className="lp-section-head">
            <span className="lp-section-eyebrow">SOLVED · 三类痛点</span>
            <h2 className="lp-section-title">
              为真正会出现在你考场上的题<em>而练</em>
            </h2>
            <p className="lp-section-deck">
              雅思口语题季每 4 个月换一次 · 背 2025 年的旧题去考 {yearShort} 年的考场，
              是这门考试里最常见、最不该犯的错误
            </p>
          </header>

          <div className="lp-why-grid">
            <article className="lp-why-card">
              <span className="lp-why-num">01</span>
              <h3>当季题季同步</h3>
              <p>
                本期所有 Part 2 Cue Card、Part 3 延展讨论、Part 1 日常问答均按
                {season.zhLabel}考场反馈整理
              </p>
            </article>
            <article className="lp-why-card">
              <span className="lp-why-num">02</span>
              <h3>整场考完才打分</h3>
              <p>
                模考过程不显示分数、不弹窗 · Part 1 → Part 2 → Part 3 一气呵成，
                交卷后统一给出五维教练注释
              </p>
            </article>
            <article className="lp-why-card">
              <span className="lp-why-num">03</span>
              <h3>横向校准 · 而非单题猜分</h3>
              <p>
                整场评分能横向对比 Part 1 vs Part 3 表现，发现「Part 1 流畅、Part 3 跑题」
                这类只有完整模考才能暴露的问题
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES — bento grid showcasing 4 core competencies ─ */}
      <section className="lp-section lp-section-tinted">
        <div className="lp-container">
          <header className="lp-section-head">
            <span className="lp-section-eyebrow">CAPABILITIES · 核心能力</span>
            <h2 className="lp-section-title">
              不只是录音回放 —— <em>每一分都能溯源</em>
            </h2>
            <p className="lp-section-deck">
              从 OpenAI 严格结构化输出到 5 维校准评分，每个环节都为「考前能用上」服务
            </p>
          </header>

          <div className="lp-bento">
            {/* ── Feature card — full width, 2-col split: text left / code right ── */}
            <article className="lp-bento-card lp-bento-feature">
              <div className="lp-feature-text">
                <span className="lp-bento-tag">
                  <span className="lp-bento-tag-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
                    </svg>
                  </span>
                  POWERED BY OPENAI · GPT-4o-mini
                </span>
                <h3 className="lp-bento-title lp-bento-title-lg">AI 评分引擎</h3>
                <p className="lp-bento-desc">Strict JSON Schema 严格结构化输出，18 字段全可追溯</p>
                <ul className="lp-feature-bullets">
                  <li><span className="lp-feature-check" aria-hidden>✓</span> OpenAI Responses API · 直连官方</li>
                  <li><span className="lp-feature-check" aria-hidden>✓</span> JSON Schema strict mode · 杜绝模型幻觉</li>
                  <li><span className="lp-feature-check" aria-hidden>✓</span> Prompt 版本化管理 · 回归可对比</li>
                </ul>
              </div>

              <div className="lp-feature-visual">
                <div className="lp-code-window">
                  <div className="lp-code-bar">
                    <span className="lp-code-dot lp-code-dot-r" />
                    <span className="lp-code-dot lp-code-dot-y" />
                    <span className="lp-code-dot lp-code-dot-g" />
                    <span className="lp-code-bar-label">POST /api/score</span>
                    <span className="lp-code-bar-status">200 OK</span>
                  </div>
                  <pre className="lp-code-body"><code>
{"{\n"}
{'  '}<span className="lp-code-key">&quot;total&quot;</span>: <span className="lp-code-num">7.5</span>,{"\n"}
{'  '}<span className="lp-code-key">&quot;fluency&quot;</span>: <span className="lp-code-num">7.5</span>,{"\n"}
{'  '}<span className="lp-code-key">&quot;vocabulary&quot;</span>: <span className="lp-code-num">7.0</span>,{"\n"}
{'  '}<span className="lp-code-key">&quot;grammar&quot;</span>: <span className="lp-code-num">7.0</span>,{"\n"}
{'  '}<span className="lp-code-key">&quot;pronunciation&quot;</span>: <span className="lp-code-num">7.5</span>,{"\n"}
{'  '}<span className="lp-code-key">&quot;completeness&quot;</span>: <span className="lp-code-num">7.0</span>{"\n"}
{"}"}
                  </code></pre>
                  <div className="lp-code-foot">
                    <span className="lp-code-foot-check" aria-hidden>✓</span>
                    Strict Schema · 18 fields · 0 hallucination
                  </div>
                </div>
              </div>
            </article>

            {/* ── Card 02 — 5-dim Radar ── */}
            <article className="lp-bento-card">
              <div className="lp-bento-head">
                <span className="lp-bento-tag">
                  <span className="lp-bento-tag-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
                      <polygon points="12,3 21,9 18,20 6,20 3,9" />
                    </svg>
                  </span>
                  5-DIM
                </span>
                <h3 className="lp-bento-title">五维评分体系</h3>
                <p className="lp-bento-desc">对标 IELTS 评分手册，0–9 分 0.5 步进</p>
              </div>
              <div className="lp-bento-visual lp-bento-visual-radar">
                <svg viewBox="0 0 240 240" className="lp-radar" aria-hidden>
                  <g transform="translate(120 120)">
                    {/* Concentric pentagon rings */}
                    <polygon points="0,-90 85,-28 53,73 -53,73 -85,-28" fill="none" stroke="var(--border)" strokeWidth="1" />
                    <polygon points="0,-67.5 64,-21 40,55 -40,55 -64,-21" fill="none" stroke="var(--border)" strokeWidth="1" />
                    <polygon points="0,-45 42,-14 26,36 -26,36 -42,-14" fill="none" stroke="var(--border)" strokeWidth="1" />
                    <polygon points="0,-22.5 21,-7 13,18 -13,18 -21,-7" fill="none" stroke="var(--border)" strokeWidth="1" />
                    {/* Axes */}
                    <line x1="0" y1="0" x2="0" y2="-90" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="0" x2="85" y2="-28" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="0" x2="53" y2="73" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="0" x2="-53" y2="73" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="0" x2="-85" y2="-28" stroke="var(--border)" strokeWidth="1" />
                    {/* Score polygon — 7.5/7.0/7.0/7.5/7.0 */}
                    <polygon
                      points="0,-75 67,-22 41,57 -45,52 -71,-23"
                      fill="rgba(234, 88, 12, 0.18)"
                      stroke="var(--accent)"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                    />
                    {/* Vertex dots */}
                    <circle cx="0" cy="-75" r="4" fill="var(--accent)" />
                    <circle cx="67" cy="-22" r="4" fill="var(--accent)" />
                    <circle cx="41" cy="57" r="4" fill="var(--accent)" />
                    <circle cx="-45" cy="52" r="4" fill="var(--accent)" />
                    <circle cx="-71" cy="-23" r="4" fill="var(--accent)" />
                  </g>
                  {/* Axis labels */}
                  <text x="120" y="22" textAnchor="middle" className="lp-radar-label">流利度</text>
                  <text x="218" y="98" textAnchor="middle" className="lp-radar-label">词汇</text>
                  <text x="178" y="216" textAnchor="middle" className="lp-radar-label">语法</text>
                  <text x="62" y="216" textAnchor="middle" className="lp-radar-label">发音</text>
                  <text x="22" y="98" textAnchor="middle" className="lp-radar-label">完整度</text>
                </svg>
              </div>
            </article>

            {/* Card 03 — Coach annotations */}
            <article className="lp-bento-card">
              <div className="lp-bento-head">
                <span className="lp-bento-tag">
                  <span className="lp-bento-tag-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-3.5-7.1L21 4l-1.1 3.5A9 9 0 0 1 21 12Z" />
                      <path d="M8 11h.01M12 11h.01M16 11h.01" />
                    </svg>
                  </span>
                  COACH NOTES
                </span>
                <h3 className="lp-bento-title">教练式反馈</h3>
                <p className="lp-bento-desc">中英双语，按维度给出可执行建议</p>
              </div>
              <div className="lp-bento-visual lp-bento-visual-coach">
                <div className="lp-coach-bubble">
                  <span className="lp-coach-tag">PRONUNCIATION · 7.5</span>
                  <p>You linked &ldquo;<strong>used to be</strong>&rdquo; very smoothly. Try the same blend on &ldquo;<strong>kind of</strong>&rdquo; — it slipped to a hard /d/.</p>
                  <p className="lp-coach-zh">「used to be」连读自然；下次试试把「kind of」也连成 /kaɪndə/，避免硬 /d/ 收尾</p>
                </div>
                <div className="lp-coach-bubble lp-coach-bubble-soft">
                  <span className="lp-coach-tag lp-coach-tag-warn">PRIORITY</span>
                  <p>Replace second &ldquo;and&rdquo; with &ldquo;on top of that&rdquo; — Part 3 needs more discourse markers.</p>
                </div>
              </div>
            </article>

            {/* Card 04 — Full Report mockup */}
            <article className="lp-bento-card">
              <div className="lp-bento-head">
                <span className="lp-bento-tag">
                  <span className="lp-bento-tag-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M7 14l3-3 3 3 4-5" />
                    </svg>
                  </span>
                  FULL REPORT
                </span>
                <h3 className="lp-bento-title">整场综合报告</h3>
                <p className="lp-bento-desc">总分 + 五维 + 分 Part 表现 + 示范答案</p>
              </div>
              <div className="lp-bento-visual lp-bento-visual-score">
                <div className="lp-mini-score">
                  <div className="lp-mini-score-head">
                    <div>
                      <p className="lp-mini-score-eyebrow">OVERALL BAND</p>
                      <p className="lp-mini-score-num">7.5<span>/9.0</span></p>
                    </div>
                    <span className="lp-mini-score-tag">已评分</span>
                  </div>
                  <div className="lp-mini-bars">
                    {[
                      { label: "FC", value: 7.5 },
                      { label: "LR", value: 7.0 },
                      { label: "GR", value: 7.0 },
                      { label: "PR", value: 7.5 },
                      { label: "CP", value: 7.0 },
                    ].map((b) => (
                      <div key={b.label} className="lp-mini-bar-row">
                        <span className="lp-mini-bar-label">{b.label}</span>
                        <div className="lp-mini-bar-track">
                          <div className="lp-mini-bar-fill" style={{ width: `${(b.value / 9) * 100}%` }} />
                        </div>
                        <span className="lp-mini-bar-val">{b.value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── FLOW ─────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <header className="lp-section-head">
            <span className="lp-section-eyebrow">14 MIN RITUAL · 考场仪式感</span>
            <h2 className="lp-section-title">
              五个段落，<em>一气呵成</em>
            </h2>
            <p className="lp-section-deck">
              从设备检测到考后报告，严格按真实考试节奏            </p>
          </header>

          <ol className="lp-flow">
            <li>
              <span className="lp-flow-marker">
                <span className="lp-flow-marker-dot" />
              </span>
              <span className="lp-flow-time">00:00</span>
              <span className="lp-flow-name">设备检测</span>
              <span className="lp-flow-desc">麦克风权限 + 录音电平 + 环境噪声三项检测，30 秒完成</span>
            </li>
            <li>
              <span className="lp-flow-marker">
                <span className="lp-flow-marker-dot" />
              </span>
              <span className="lp-flow-time">00:30</span>
              <span className="lp-flow-name">Part 1 · 日常问答</span>
              <span className="lp-flow-desc">2–3 个 Topic 共 6–8 题，按当季高频题面随机抽取</span>
            </li>
            <li>
              <span className="lp-flow-marker">
                <span className="lp-flow-marker-dot" />
              </span>
              <span className="lp-flow-time">04:30</span>
              <span className="lp-flow-name">Part 2 · Cue Card</span>
              <span className="lp-flow-desc">60 秒准备时间 + 1.5–2 分钟独白，屏幕配纸笔区</span>
            </li>
            <li>
              <span className="lp-flow-marker">
                <span className="lp-flow-marker-dot" />
              </span>
              <span className="lp-flow-time">07:30</span>
              <span className="lp-flow-name">Part 3 · 延展讨论</span>
              <span className="lp-flow-desc">4–6 个跟 Part 2 同主题的深度讨论，2–3 句展开</span>
            </li>
            <li>
              <span className="lp-flow-marker">
                <span className="lp-flow-marker-dot" />
              </span>
              <span className="lp-flow-time">12:30</span>
              <span className="lp-flow-name">整场报告</span>
              <span className="lp-flow-desc">总分 + 5 维分项 + 分 Part 教练注释 + 高分示范答案</span>
            </li>
          </ol>
        </div>
      </section>

      {/* ─── QUOTE — dark block, palette break ───────────── */}
      <section className="lp-quote-section">
        <div className="lp-quote-aurora lp-quote-aurora-1" aria-hidden />
        <div className="lp-quote-aurora lp-quote-aurora-2" aria-hidden />
        <div className="lp-container">
          <figure className="lp-quote">
            <p className="lp-quote-mark"><em>&ldquo;</em></p>
            <blockquote>
              真考是连续 14 分钟的高强度对话<br />
              <em>单题刷题永远练不到</em> Part 3 越答越累的状态            </blockquote>
            <figcaption>百科口语 · 编辑部</figcaption>
          </figure>
        </div>
      </section>

      {/* ─── TAIL ─────────────────────────────────────────── */}
      <section className="lp-tail">
        <div className="lp-tail-aurora" aria-hidden />
        <div className="lp-container">
          <p className="lp-supertitle lp-supertitle-center">
            <em>Ready when you are.</em>
          </p>
          <h2>
            准备好<em>开口</em>了吗？
          </h2>
          <p>选一段 15 分钟，按下「开始模考」之后，时间不会停</p>
          <div className="lp-actions lp-actions-center">
            <Link href="/mock" className="sb-btn sb-btn-accent sb-btn-lg">
              开始本期模考
            </Link>
            <Link href="/mock/check" className="sb-btn sb-btn-ghost sb-btn-lg">
              先做设备检测
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
