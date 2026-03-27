# 部署操作指南

## 第一步：配置 Supabase（预计 15 分钟）

### 1.1 创建 Supabase 项目
1. 访问 https://supabase.com/dashboard
2. 点击 "New Project"
3. 填写信息：
   - Name: `ai-ielts-speaking` (或你喜欢的名字)
   - Database Password: 生成一个强密码并保存
   - Region: 选择 `Singapore` 或 `Tokyo`（离中国近）
4. 点击 "Create new project"，等待 2-3 分钟初始化

### 1.2 获取 API 密钥
1. 项目创建完成后，进入 `Settings` → `API`
2. 复制以下信息（稍后配置 Vercel 时需要）：
   - `Project URL` → 这是你的 `SUPABASE_URL`
   - `anon public` key → 这是你的 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key（点击 "Reveal" 显示）→ 这是你的 `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 执行数据库 Schema
1. 在 Supabase Dashboard，点击左侧 `SQL Editor`
2. 点击 "New query"
3. 打开本地文件 `supabase/schema.sql`，复制全部内容
4. 粘贴到 SQL Editor，点击 "Run"
5. 等待执行完成（应该显示 "Success"）

### 1.4 启用 RLS 策略
1. 继续在 SQL Editor 中，点击 "New query"
2. 打开本地文件 `supabase/migrations/001_enable_rls.sql`，复制全部内容
3. 粘贴到 SQL Editor，点击 "Run"
4. 验证：点击左侧 `Database` → `Tables`，选择 `practice_sessions` 表
5. 在右上角应该看到 "RLS enabled" 的标识

### 1.5 导入题库数据
1. 继续在 SQL Editor 中，点击 "New query"
2. 打开本地文件 `supabase/seed-questions.sql`，复制全部内容
3. 粘贴到 SQL Editor，点击 "Run"
4. 验证：点击左侧 `Table Editor` → `questions` 表，应该能看到导入的题目

### 1.6 创建初始 Prompt 版本
1. 继续在 SQL Editor 中，点击 "New query"
2. 粘贴以下 SQL：
```sql
INSERT INTO prompt_versions (id, name, description, status)
VALUES ('v1.0', 'v1.0', 'Initial scoring prompt', 'current');
```
3. 点击 "Run"

### 1.7 配置 Auth
1. 点击左侧 `Authentication` → `Providers`
2. 确认 `Email` 已启用（默认应该是启用的）
3. 点击 `URL Configuration`
4. 暂时先不填，等 Vercel 部署完成后再回来填

✅ Supabase 配置完成！

---

## 第二步：配置 Vercel（预计 10 分钟）

### 2.1 连接 GitHub 仓库
1. 确保你的代码已推送到 GitHub
2. 访问 https://vercel.com/dashboard
3. 点击 "Add New..." → "Project"
4. 选择你的 GitHub 仓库（如果没看到，点击 "Adjust GitHub App Permissions"）
5. 点击 "Import"

### 2.2 配置项目设置
在 "Configure Project" 页面：
1. **Framework Preset**: 自动识别为 `Next.js`（无需修改）
2. **Root Directory**: 保持 `./`（无需修改）
3. **Build and Output Settings**: 保持默认（无需修改）

### 2.3 配置环境变量
点击 "Environment Variables"，逐个添加以下变量：

**必需变量（6 个）：**

1. `OPENAI_API_KEY`
   - Value: 你的 OpenAI API Key（从 https://platform.openai.com/api-keys 获取）

2. `NEXT_PUBLIC_SUPABASE_URL`
   - Value: 从 Supabase 复制的 Project URL

3. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: 从 Supabase 复制的 anon public key

4. `SUPABASE_URL`
   - Value: 和 `NEXT_PUBLIC_SUPABASE_URL` 相同

5. `SUPABASE_SERVICE_ROLE_KEY`
   - Value: 从 Supabase 复制的 service_role key

6. `ADMIN_EMAIL`
   - Value: 你的邮箱（用于登录后台，例如 `your-email@example.com`）

### 2.4 开始部署
1. 确认所有环境变量已填写
2. 点击 "Deploy"
3. 等待 2-3 分钟，Vercel 会自动构建和部署

### 2.5 获取部署 URL
1. 部署完成后，会显示 "Congratulations" 页面
2. 复制你的项目 URL（格式：`https://your-project.vercel.app`）

✅ Vercel 部署完成！

---

## 第三步：回到 Supabase 配置 Auth 回调（预计 2 分钟）

### 3.1 配置回调 URL
1. 回到 Supabase Dashboard
2. 点击 `Authentication` → `URL Configuration`
3. 填写以下信息：
   - **Site URL**: `https://your-project.vercel.app`（你的 Vercel URL）
   - **Redirect URLs**: 添加 `https://your-project.vercel.app/auth/callback`
4. 点击 "Save"

✅ Auth 配置完成！

---

## 第四步：端到端测试（预计 10 分钟）

### 4.1 访问网站
1. 打开你的 Vercel URL：`https://your-project.vercel.app`
2. 应该自动跳转到登录页

### 4.2 注册账号
1. 点击 "注册" 或 "Sign Up"
2. 用你的邮箱注册（建议用 `ADMIN_EMAIL` 配置的邮箱，这样可以直接测试 Admin 功能）
3. 检查邮箱，点击确认链接
4. 登录成功后应该跳转到 `/practice` 页面

### 4.3 测试学生端流程
1. 选择一个 Part（Part 1 / Part 2 / Part 3）
2. 选择一个 Topic
3. 选择一个 Question
4. 点击录音按钮，说几句话（至少 10 秒）
5. 停止录音，等待转写
6. 转写完成后，等待 AI 评分（约 10-20 秒）
7. 查看评分结果和反馈
8. 点击 "历史记录"，确认刚才的练习已保存

### 4.4 测试 Admin 后台
1. 访问 `https://your-project.vercel.app/admin`
2. 如果你用 `ADMIN_EMAIL` 注册的账号登录，应该能看到后台
3. 如果用其他邮箱登录，应该被重定向到 `/practice`（说明权限保护生效）
4. 在后台查看：
   - 数据概览（Dashboard）
   - 会话列表（Sessions）
   - 学生列表（Students）
   - 题库管理（Questions）
   - 规则版本（Rules）

### 4.5 检查 Vercel Logs
1. 回到 Vercel Dashboard
2. 点击你的项目 → `Logs`
3. 确认没有红色错误（黄色 warning 可以忽略）
4. 特别检查 `/api/transcribe` 和 `/api/score` 的调用是否成功

### 4.6 检查 Supabase 数据
1. 回到 Supabase Dashboard
2. 点击 `Table Editor` → `practice_sessions`
3. 应该能看到刚才测试的练习记录
4. 点击 `Authentication` → `Users`
5. 应该能看到你注册的账号

✅ 测试通过！

---

## 第五步：邀请内测用户（预计 5 分钟）

### 5.1 准备内测说明
给朋友/同学发送：
```
Hi！我做了一个 AI 雅思口语陪练工具，想邀请你试用一下 🎉

网址：https://your-project.vercel.app

功能：
- Part 1/2/3 口语练习
- 实时录音 + AI 转写
- AI 评分 + 详细反馈
- 历史记录回放

使用方法：
1. 注册账号（用你的邮箱）
2. 选择 Part 和题目
3. 点击录音，说 30 秒以上
4. 等待 AI 评分和反馈

如果遇到问题，随时告诉我！
```

### 5.2 监控使用情况
1. 定期检查 Vercel Logs（看是否有错误）
2. 定期检查 Supabase `practice_sessions` 表（看有多少人在用）
3. 定期检查 OpenAI Usage（https://platform.openai.com/usage）

---

## 常见问题排查

### 问题 1：部署失败
- 检查 Vercel Logs 中的错误信息
- 常见原因：环境变量缺失或格式错误
- 解决：在 Vercel Dashboard → Settings → Environment Variables 中检查

### 问题 2：登录后白屏
- 检查 Supabase Auth 回调 URL 是否正确配置
- 检查浏览器控制台是否有错误
- 解决：确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确

### 问题 3：录音后转写失败
- 检查 `OPENAI_API_KEY` 是否有效
- 检查 OpenAI 账户是否有余额
- 检查 Vercel Logs 中的错误信息

### 问题 4：评分很慢或超时
- 正常情况下评分需要 10-30 秒
- 如果超过 1 分钟，检查 OpenAI API 状态
- Vercel Hobby 版函数超时限制是 10 秒，可能需要升级

### 问题 5：Admin 后台访问不了
- 确认 `ADMIN_EMAIL` 环境变量已设置
- 确认你用这个邮箱注册并登录
- 邮箱必须完全匹配（区分大小写）

---

## 成本估算（内测阶段）

假设 10 个内测用户，每人每天练习 3 次：

**OpenAI 成本：**
- Whisper 转写：$0.006/分钟 × 1 分钟 × 30 次/天 = $0.18/天
- GPT-4o-mini 评分：$0.15/1M tokens × 2000 tokens × 30 次/天 = $0.009/天
- **合计：约 $0.19/天 = $5.7/月**

**Supabase 成本：**
- 免费版足够（500MB 数据库 + 2GB 带宽/月）

**Vercel 成本：**
- 免费版足够（100GB 带宽/月）

**总成本：约 $6/月**

---

## 下一步

部署完成后，你可以：
1. 收集内测用户反馈
2. 监控错误日志和使用数据
3. 根据反馈迭代优化
4. 准备正式公开发布

祝部署顺利！🚀
