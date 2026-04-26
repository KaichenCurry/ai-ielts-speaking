import Link from "next/link";
import { redirect } from "next/navigation";
import { DeviceCheck } from "@/components/mock/device-check";
import { getServerUser } from "@/lib/supabase/auth-server";

export default async function MockCheckPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mock-check-page">
      <div className="mock-check-header">
        <Link href="/mock" className="mock-back-link">
          ← 返回模考大厅
        </Link>
        <h1>考前设备检测</h1>
        <p>30 秒内确认麦克风、网络与环境符合考试要求</p>
      </div>
      <DeviceCheck />
    </main>
  );
}
