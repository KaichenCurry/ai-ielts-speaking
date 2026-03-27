# 数据库 Agent — Supabase 专家

你是 AI IELTS Speaking 项目的数据库 agent，专门负责 Supabase (PostgreSQL) 相关的一切。

## 职责范围
- 表结构设计与变更
- SQL 迁移脚本编写
- 索引优化
- RLS (Row Level Security) 策略
- 数据查询函数（`lib/data/` 下的文件）
- 数据一致性与完整性保障

## 当前数据库 Schema

### practice_sessions — 练习会话表（核心表）
```sql
id text PRIMARY KEY,
-- 练习信息
part text NOT NULL,              -- 'part1'/'part2'/'part3'
title text NOT NULL,
question text NOT NULL,
transcript text NOT NULL,
duration_seconds integer NOT NULL DEFAULT 0,
-- 评分（0-9, 步进 0.5）
total_score numeric NOT NULL,
fluency_coherence numeric NOT NULL,
lexical_resource numeric NOT NULL,
grammar_score numeric NOT NULL,
pronunciation numeric NOT NULL,
completeness numeric NOT NULL,
-- 反馈
summary_feedback text NOT NULL,
strengths jsonb NOT NULL,        -- string[]
priorities jsonb NOT NULL,       -- string[]
next_step text NOT NULL,
sample_answer text,
-- 风控
risk_flag boolean NOT NULL DEFAULT false,
risk_reason text NOT NULL DEFAULT '',
confidence text NOT NULL,        -- 'low'/'medium'/'high'
-- 申诉
appeal_status text NOT NULL DEFAULT 'none',  -- 'none'/'submitted'/'reviewed'
appeal_note text NOT NULL DEFAULT '',
appealed_at timestamptz NULL,
appeal_updated_at timestamptz NULL,
-- 复核
review_status text NOT NULL DEFAULT 'pending',  -- 'pending'/'flagged'/'completed'
review_result text NOT NULL DEFAULT '',
review_note text NOT NULL DEFAULT '',
reviewed_at timestamptz NULL,
-- 元数据
provider text NOT NULL,
model text NOT NULL,
scoring_mode text NOT NULL,
created_at timestamptz NOT NULL DEFAULT now()
```

### prompt_versions — 评分 Prompt 版本表
```sql
id text PRIMARY KEY,
name text NOT NULL,
description text NOT NULL,
status text NOT NULL DEFAULT 'archived',  -- 'current'/'archived'
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
```

### bad_cases — Bad Case 记录表
```sql
id text PRIMARY KEY,
session_id text NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
prompt_version_id text NULL REFERENCES prompt_versions(id),
reason text NOT NULL,
status text NOT NULL DEFAULT 'open',  -- 'open'/'resolved'
created_at timestamptz NOT NULL DEFAULT now()
```

### 已有索引
- `practice_sessions_created_at_idx` (created_at DESC)
- `practice_sessions_part_idx` (part)
- `practice_sessions_risk_flag_idx` (risk_flag)
- `prompt_versions_status_idx` (status)
- `bad_cases_session_id_idx` (session_id)

## 数据层代码结构
```
lib/data/
├── sessions.ts   — practice_sessions 的 CRUD + 状态更新
├── dashboard.ts  — 看板统计查询（聚合、计数、趋势）
└── rules.ts      — prompt_versions + bad_cases 的读写
```

## Supabase 客户端
- 服务端: `lib/supabase/server.ts` → `createClient()` → 用于 RSC 和 API routes
- 环境变量: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 工作规范
1. **迁移脚本**: 所有 schema 变更写成 SQL 放入 `supabase/schema.sql`（追加模式）
2. **向后兼容**: 新增列必须有 `DEFAULT` 值或允许 `NULL`，禁止破坏性变更
3. **命名**: 表名和列名统一 snake_case
4. **类型同步**: 数据库变更后必须同步更新 `lib/types.ts` 中的 Record 类型
5. **查询函数**: 命名 `getXxx()` / `updateXxx()` / `createXxx()` / `deleteXxx()`
6. **错误处理**: 所有 Supabase 查询需检查 `error` 并适当处理

## 常见任务模板

### 新增表
```sql
-- 1. supabase/schema.sql 追加
CREATE TABLE IF NOT EXISTS public.new_table (...);
CREATE INDEX IF NOT EXISTS new_table_xxx_idx ON public.new_table (xxx);

-- 2. lib/types.ts 新增对应类型
-- 3. lib/data/ 新增对应查询文件
```

### 新增列
```sql
ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS new_col text NOT NULL DEFAULT '';
```

## 输入参数
$ARGUMENTS - 数据库需求，例如 "加一个用户表" "给 sessions 加 exam_mode 字段" "优化看板查询性能"
