import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-bg-orb orb-3" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI · IELTS · Speaking
          </div>
          <h1 className="hero-title">
            开口说，<br />
            <span className="hero-title-accent">AI 帮你变更好</span>
          </h1>
          <p className="hero-desc">
            模拟真实雅思口语考场，录音即评分。<br />
            流利度、词汇、语法、发音，四维精准诊断。
          </p>
          <div className="hero-actions">
            <Link className="hero-cta-primary" href="/practice">
              立即开始练习
              <span className="cta-arrow">→</span>
            </Link>
            <Link className="hero-cta-secondary" href="/history">
              查看我的记录
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">2</span>
              <span className="hero-stat-label">练习模块</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">5</span>
              <span className="hero-stat-label">评分维度</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">AI</span>
              <span className="hero-stat-label">实时反馈</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="score-preview-card">
            <div className="score-preview-header">
              <span className="score-preview-badge">AI 评分结果</span>
            </div>
            <div className="score-preview-total">
              <span className="score-preview-num">7.0</span>
              <span className="score-preview-unit">/ 9.0</span>
            </div>
            <div className="score-preview-bars">
              {[
                { label: "流利度", val: 75 },
                { label: "词汇", val: 82 },
                { label: "语法", val: 70 },
                { label: "发音", val: 78 },
              ].map((item) => (
                <div className="score-bar-row" key={item.label}>
                  <span className="score-bar-label">{item.label}</span>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${item.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="score-preview-tip">
              💡 建议多练习连接词，提升连贯性
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="home-section">
        <div className="section-label-row">
          <span className="section-label">HOW IT WORKS</span>
        </div>
        <h2 className="section-heading">三步完成一次完整练习</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <h3>选题开口</h3>
            <p>选择 Part 1/2/3，点击录音，像真实考试一样作答。</p>
          </div>
          <div className="step-connector" />
          <div className="step-card">
            <div className="step-num">02</div>
            <h3>AI 转写评分</h3>
            <p>Whisper 精准转写，GPT-4 从五个维度给出 0–9 分评分。</p>
          </div>
          <div className="step-connector" />
          <div className="step-card">
            <div className="step-num">03</div>
            <h3>教练式反馈</h3>
            <p>优点、改进点、下一步建议、高分示范答案，一次看完。</p>
          </div>
        </div>
      </section>

      {/* ── Parts ── */}
      <section className="home-section">
        <div className="section-label-row">
          <span className="section-label">PRACTICE MODULES</span>
        </div>
        <h2 className="section-heading">按真实题库结构进入练习</h2>
        <div className="parts-grid">
          {[
            { num: "01", part: "Part 1", title: "Topic → Question", desc: "先选 Topic，再进入该 Topic 下的具体问题，更符合 Part 1 题库组织方式。", color: "#3b82f6", href: "/practice/part1" },
            { num: "02", part: "Part 2 & Part 3", title: "Topic → Cue Card → Discussion", desc: "按 Topic 同时查看 Part 2 卡片、示范答案和对应的 Part 3 延展问题。", color: "#8b5cf6", href: "/practice/part23" },
          ].map((p) => (
            <Link className="part-showcase-card" href={p.href} key={p.num}>
              <div className="part-showcase-num" style={{ color: p.color }}>{p.num}</div>
              <div className="part-showcase-tag" style={{ background: `${p.color}18`, color: p.color }}>{p.part}</div>
              <h3 className="part-showcase-title">{p.title}</h3>
              <p className="part-showcase-desc">{p.desc}</p>
              <span className="part-showcase-cta" style={{ color: p.color }}>开始练习 →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
