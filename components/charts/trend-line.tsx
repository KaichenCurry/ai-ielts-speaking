import { useId } from "react";
import type { ScoreTrendPoint } from "@/lib/data/dashboard-stats";

function formatAxisLabel(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${Number(month)}/${Number(day)}`;
}

export function TrendLine({ points }: { points: ScoreTrendPoint[] }) {
  if (points.length < 2) {
    return <div className="trend-empty">至少完成两次练习后，这里才会展示你的成绩趋势。</div>;
  }

  const gradientId = useId().replace(/:/g, "");
  const width = 420;
  const height = 220;
  const padding = { top: 18, right: 20, bottom: 34, left: 28 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const yTicks = [0, 3, 6, 9];

  const coordinates = points.map((point, index) => {
    const x = padding.left + (index / (points.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (point.total / 9) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${padding.top + innerHeight} L ${coordinates[0].x} ${padding.top + innerHeight} Z`;

  return (
    <div className="trend-line-chart">
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="最近成绩趋势图">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(29, 78, 216, 0.28)" />
            <stop offset="100%" stopColor="rgba(29, 78, 216, 0.02)" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = padding.top + innerHeight - (tick / 9) * innerHeight;
          return (
            <g key={tick}>
              <line className="trend-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="trend-axis-label" textAnchor="end" x={padding.left - 8} y={y + 4}>
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path className="trend-line-path" d={linePath} />

        {coordinates.map((point) => (
          <circle className="trend-point" cx={point.x} cy={point.y} key={`${point.date}-${point.x}`} r="4.5" />
        ))}

        {coordinates.map((point) => (
          <text className="trend-axis-label" key={`${point.date}-${point.x}-label`} textAnchor="middle" x={point.x} y={height - 8}>
            {formatAxisLabel(point.date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
