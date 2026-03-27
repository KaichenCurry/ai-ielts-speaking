import Link from "next/link";
import { redirect } from "next/navigation";
import { QuestionCreatePanel } from "@/components/admin/question-create-panel";
import { PageShell, SectionCard } from "@/components/page-shell";
import { Badge } from "@/components/ui";
import { getServerUser, isAdminEmail } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

async function requireAdminAccess() {
  const user = await getServerUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/practice");
  }
}

export default async function AdminQuestionNewPage() {
  await requireAdminAccess();

  return (
    <PageShell
      title="新建题目"
      description="手动添加一道自定义题目，将以 custom- 前缀写入 Supabase 并立即在练习流中生效。"
      actions={
        <Link className="link-button secondary" href="/admin/questions">
          返回题库列表
        </Link>
      }
    >
      {!isSupabaseConfigured() ? (
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，无法新建题目。</p>
          <p className="inline-note">请先补齐数据库环境变量，再进入题库治理链路。</p>
        </SectionCard>
      ) : (
        <div className="admin-detail-layout">
          <div className="admin-detail-two-col">
            <SectionCard title="创建前确认">
              <div className="admin-session-summary-row">
                <div className="kpi-card">
                  <p className="kpi-card-value">custom-</p>
                  <p className="kpi-card-label">ID 前缀</p>
                </div>
                <div className="kpi-card">
                  <p className="kpi-card-value">Supabase</p>
                  <p className="kpi-card-label">写入位置</p>
                </div>
                <div className="kpi-card">
                  <p className="kpi-card-value">立即生效</p>
                  <p className="kpi-card-label">练习流状态</p>
                </div>
                <div className="kpi-card">
                  <p className="kpi-card-value">可继续编辑</p>
                  <p className="kpi-card-label">创建后动作</p>
                </div>
              </div>
              <p className="inline-note" style={{ marginTop: 12 }}>
                新建题默认走自定义题链路。创建成功后会直接跳到详情页，你可以继续编辑内容、调整启用状态，或后续删除。
              </p>
            </SectionCard>

            <SectionCard title="录入建议">
              <div className="tag-row">
                <Badge>先选 Part</Badge>
                <Badge>Topic 尽量统一命名</Badge>
                <Badge>题干尽量一句一问</Badge>
              </div>
              <ul className="muted-list" style={{ marginTop: 12 }}>
                <li>Part 1 适合简短直接的问题。</li>
                <li>Part 2 / Part 3 建议把题干和提示语拆分填写，便于学生阅读。</li>
                <li>如果暂时不想投放，可取消“创建后立即启用”。</li>
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="填写题目信息">
            <QuestionCreatePanel />
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}
