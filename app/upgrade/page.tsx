import Link from "next/link";
import { redirect } from "next/navigation";
import { UpgradeAccountForm } from "@/components/auth/upgrade-account-form";
import { getServerUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Already a real account → no need to upgrade.
  if (!user.is_anonymous) {
    redirect("/mock");
  }

  return (
    <main className="sb-upgrade-page">
      <div className="sb-upgrade-card">
        <span className="sb-eyebrow sb-eyebrow-orange">
          <span className="sb-eyebrow-dot" />
          升级账号
        </span>
        <h1>把你的访客记录变成正式账号</h1>
        <p>
          填一个邮箱和密码，你的所有模考记录、报告和分项分数会保持原样，绑定到你的新账号上          以后在任何设备登录都能看到，不再绑死在这台浏览器        </p>

        <ul className="sb-upgrade-perks">
          <li>✓ 所有已完成的模考报告都会被保留</li>
          <li>✓ 跨设备同步：手机、平板、电脑通用</li>
          <li>✓ 评分历史与五维趋势图表（即将上线）</li>
          <li>✓ 支持申诉和人工复核流程</li>
        </ul>

        <UpgradeAccountForm />

        <p className="sb-upgrade-foot">
          不想升级？<Link href="/mock">继续以访客身份模考</Link>
        </p>
      </div>
    </main>
  );
}
