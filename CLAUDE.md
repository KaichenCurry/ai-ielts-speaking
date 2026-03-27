# AI IELTS Speaking 项目上下文

## 项目定位
AI 雅思口语陪练与质检运营平台。学生端 + 后台治理端双端结构。
- 学生端：Part 1/2/3 口语练习 → 录音 → ASR 转写 → AI 评分 → 结构化反馈 → 历史复盘
- 治理端：会话回放、评分审查、异常标记、申诉处理、人工复核、Prompt 版本管理、Bad Case 沉淀

## 技术栈
- **框架**: Next.js 16 (App Router) + React 19 + TypeScript
- **数据库**: Supabase (PostgreSQL)
- **AI**: OpenAI API (gpt-4.1-mini 评分, Whisper ASR 转写)
- **部署目标**: Vercel + Supabase Cloud
- **包管理**: npm

## 项目结构
```
app/
├── page.tsx                        # 首页
├── practice/
│   ├── page.tsx                    # Part 选择页
│   ├── part1/
│   │   ├── page.tsx                # Part 1 Topic 列表
│   │   ├── [topicSlug]/page.tsx    # Part 1 Question 列表
│   │   └── [topicSlug]/[questionId]/page.tsx # Part 1 练习页
│   └── part23/
│       ├── page.tsx                # Part 2 & 3 Topic 列表
│       ├── [topicSlug]/page.tsx    # Topic 详情（Cue Card / Sample / Part 3）
│       └── [topicSlug]/[questionId]/page.tsx # Part 2 / 3 练习页
├── result/[sessionId]/page.tsx     # 练习结果页（评分+反馈+申诉）
├── history/
│   ├── page.tsx                    # 历史记录列表
│   └── [sessionId]/page.tsx        # 历史详情页
├── admin/
│   ├── page.tsx                    # 后台数据概览
│   ├── sessions/
│   │   ├── page.tsx                # 会话列表
│   │   └── [sessionId]/page.tsx    # 会话复核详情
│   └── rules/page.tsx              # Prompt/规则版本管理
├── api/
│   ├── transcribe/route.ts         # ASR 语音转写
│   ├── score/route.ts              # AI 评分（核心）
│   ├── review/route.ts             # 复核操作
│   ├── submit-appeal/route.ts      # 提交申诉
│   ├── bad-case/route.ts           # Bad Case 管理
│   └── rules/route.ts              # 规则版本管理
components/
├── ui.tsx                          # 通用 UI 组件
├── page-shell.tsx                  # 页面外壳布局
├── practice/practice-workspace.tsx # 练习工作区（录音核心组件）
├── result/
│   ├── result-client-view.tsx      # 结果展示
│   └── appeal-action-panel.tsx     # 申诉操作
├── admin/
│   ├── review-action-panel.tsx     # 复核操作面板
│   ├── bad-case-panel.tsx          # Bad Case 面板
│   └── rule-version-panel.tsx      # 规则版本面板
lib/
├── types.ts                        # 全局类型定义
├── mock-data.ts                    # Mock 数据和题目配置
├── result-storage.ts               # 结果本地缓存
├── supabase/server.ts              # Supabase 服务端客户端
├── data/
│   ├── sessions.ts                 # 练习会话 CRUD
│   ├── dashboard.ts                # 仪表盘数据查询
│   └── rules.ts                    # 规则版本数据
supabase/
└── schema.sql                      # 数据库 Schema
```

## 数据库 Schema（Supabase）
### practice_sessions - 练习会话表
核心字段: id, part, title, question, transcript, duration_seconds
评分字段: total_score, fluency_coherence, lexical_resource, grammar_score, pronunciation, completeness
反馈字段: summary_feedback, strengths(jsonb), priorities(jsonb), next_step, sample_answer
风控字段: risk_flag, risk_reason, confidence
申诉字段: appeal_status(none/submitted/reviewed), appeal_note, appealed_at
复核字段: review_status(pending/flagged/completed), review_result, review_note, reviewed_at
元数据: provider, model, scoring_mode, created_at

### prompt_versions - 评分 Prompt 版本表
字段: id, name, description, status(current/archived), created_at, updated_at

### bad_cases - Bad Case 记录表
字段: id, session_id(FK), prompt_version_id(FK), reason, status(open/resolved), created_at

## 代码规范
- 组件: React 函数组件 + Hooks, 文件名 kebab-case
- 类型: 所有类型集中在 lib/types.ts, 数据库记录类型用 snake_case, 前端类型用 camelCase
- API: Next.js Route Handlers (app/api/), 返回 NextResponse.json()
- 样式: 全局 CSS (globals.css), 无 Tailwind, class 命名语义化
- 状态: 客户端组件用 "use client", 服务端组件默认 RSC
- 评分: 0-9 分, 0.5 步进, normalizeScore() 确保合规
- Supabase: 服务端通过 lib/supabase/server.ts 的 createClient() 访问

## 关键设计决策
1. 评分使用 OpenAI Responses API + JSON Schema strict mode, 确保结构化输出
2. 录音使用浏览器 MediaRecorder API, webm 格式
3. 转写先走 OpenAI Whisper, 后续可扩展其他 ASR
4. 前端结果页通过 sessionStorage 传递评分数据, 同时写入 Supabase 持久化
5. 后台治理端与学生端共享同一数据库, 通过 review_status/appeal_status 区分流程状态

## 环境变量
- OPENAI_API_KEY: OpenAI API 密钥（.env.local）
- NEXT_PUBLIC_SUPABASE_URL: Supabase 项目 URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase 匿名密钥

## 命令体系（Skill + Subagent）

不知道该用哪个？先调总管: `/master 你的需求`

### Skills（参考手册型 — 注入当前对话，写代码时随时参考）
调用方式: `/skills` → 选择，或直接 `/master`、`/frontend` 等

| 命令 | 名称 | 职责 | 使用场景 |
|------|------|------|----------|
| `/master` | 总管 | 需求分析、任务拆解、Agent 调度 | 复杂需求不知从哪下手时 |
| `/frontend` | 前端 | 页面、组件、样式、交互、设计美学 | 写页面、改 UI、加功能 |
| `/scoring` | 评分 | 评分 Prompt 优化、Bad Case 分析 | 评分不准、反馈不好时 |
| `/database` | 数据库 | Supabase 表设计、迁移、查询 | 改表结构、加字段、写查询 |
| `/governance` | 治理 | 复核、申诉、Bad Case、看板 | 后台功能开发 |

### Subagents（独立执行型 — 独立窗口运行，跑完汇报结果）
调用方式: `/agents` → 选择对应 agent

| 名称 | 职责 | 使用场景 |
|------|------|----------|
| test | 构建检查、类型检查、链路验证 | 改完代码跑一遍检查 |
| review | 代码质量、安全、性能、规范 | 功能做完、部署前审查 |
| deploy | Vercel 部署、环境变量、上线 | 部署和排错 |
| daily-log | 日终项目总结、改动记录、知识沉淀 | 一天结束时 |
