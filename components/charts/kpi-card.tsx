import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: ReactNode;
};

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <p className="kpi-card-value">{value}</p>
      <p className="kpi-card-label">{label}</p>
    </div>
  );
}
