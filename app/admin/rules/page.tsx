import Link from "next/link";
import { PageShell, SectionCard } from "@/components/page-shell";
import { RuleVersionPanel } from "@/components/admin/rule-version-panel";
import { listPromptVersions } from "@/lib/data/rules";
import { formatDate } from "@/lib/result-display";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RulesSearchParams = { success?: string; error?: string };

export default async function RulesPage({
  searchParams,
}: {
  searchParams?: Promise<RulesSearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const successMessage = resolved?.success?.trim();
  const errorMessage = resolved?.error?.trim();

  const isDatabaseReady = isSupabaseConfigured();
  const promptVersions = isDatabaseReady ? await listPromptVersions() : [];
  const currentVersion = promptVersions.find((v) => v.status === "current");
  const archivedCount = promptVersions.filter((version) => version.status === "archived").length;
  const latestUpdatedAt = promptVersions[0]?.updatedAt;

  return (
    <PageShell
      title="规则版本管理"
      description="记录每次 Prompt 更新，关联 bad case，便于追踪评分质量变化。"
      actions={
        <Link className="link-button secondary" href="/admin">
          返回后台总览
        </Link>
      }
    >
      {errorMessage ? <p className="message-error">{errorMessage}</p> : null}
      {successMessage ? <p className="message-success">{successMessage}</p> : null}

      {!isDatabaseReady ? (
        <SectionCard title="数据库未配置">
          <p>当前未配置 Supabase，无法查看或管理真实规则版本。</p>
          <p className="inline-note">请先补齐数据库环境变量，再进入规则治理链路。</p>
        </SectionCard>
      ) : (
        <div className="admin-detail-layout">
          <SectionCard title="规则概览">
            <div className="admin-session-summary-row">
              <div className="kpi-card">
                <p className="kpi-card-value">{promptVersions.length}</p>
                <p className="kpi-card-label">版本总数</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{currentVersion ? 1 : 0}</p>
                <p className="kpi-card-label">当前生效</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{archivedCount}</p>
                <p className="kpi-card-label">已归档</p>
              </div>
              <div className="kpi-card">
                <p className="kpi-card-value">{latestUpdatedAt ? formatDate(latestUpdatedAt) : "—"}</p>
                <p className="kpi-card-label">最近更新</p>
              </div>
            </div>
            <p className="inline-note" style={{ marginTop: 12 }}>
              新增版本后可直接在下方切换当前生效项；如果某次评分问题需要回溯，也可以按时间回看历史版本说明。
            </p>
          </SectionCard>

          <div className="admin-overview-two-col">
            {currentVersion ? (
              <SectionCard title="当前生效版本">
                <p><strong>{currentVersion.name}</strong></p>
                <p style={{ marginTop: 8 }}>{currentVersion.description}</p>
                <p className="inline-note" style={{ marginTop: 8 }}>
                  更新于 {formatDate(currentVersion.updatedAt)}
                </p>
              </SectionCard>
            ) : (
              <SectionCard title="当前生效版本">
                <p className="inline-note">尚未设置任何生效版本。新增一个版本并设为“当前生效”即可。</p>
              </SectionCard>
            )}

            <SectionCard title="使用建议">
              <ul className="muted-list">
                <li>版本名称尽量带上用途或迭代目标，方便后续回溯。</li>
                <li>版本说明建议记录本次改动关注的问题类型，例如分数偏高、发音误判、完整度过严等。</li>
                <li>切换“当前生效”后，新进入评分链路的会话将使用最新规则。</li>
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="新增与切换版本">
            <RuleVersionPanel versions={promptVersions} />
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}
