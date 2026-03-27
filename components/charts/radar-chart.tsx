import { DIMENSION_LABELS } from "@/lib/result-display";
import type { PracticeSession } from "@/lib/types";

const DIMENSIONS: Array<{
  key: keyof PracticeSession["score"];
  shortLabel: string;
}> = [
  { key: "fluencyCoherence", shortLabel: "流利度" },
  { key: "lexicalResource", shortLabel: "词汇" },
  { key: "grammar", shortLabel: "语法" },
  { key: "pronunciation", shortLabel: "发音" },
  { key: "completeness", shortLabel: "完整度" },
];

export function RadarChart({ score }: { score: PracticeSession["score"] }) {
  const size = 340;
  const centerX = 170;
  const centerY = 150;
  const radius = 96;
  const levels = 5;
  const maxScore = 9;

  function getPoint(index: number, value: number) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / DIMENSIONS.length;
    const scaledRadius = (value / maxScore) * radius;
    return {
      x: centerX + Math.cos(angle) * scaledRadius,
      y: centerY + Math.sin(angle) * scaledRadius,
    };
  }

  const gridPolygons = Array.from({ length: levels }, (_, index) => {
    const levelValue = ((index + 1) / levels) * maxScore;
    return DIMENSIONS.map((_, dimensionIndex) => {
      const point = getPoint(dimensionIndex, levelValue);
      return `${point.x},${point.y}`;
    }).join(" ");
  });

  const axisLines = DIMENSIONS.map((_, index) => {
    const point = getPoint(index, maxScore);
    return { id: index, x: point.x, y: point.y };
  });

  const dataPolygon = DIMENSIONS.map((dimension, index) => {
    const point = getPoint(index, score[dimension.key]);
    return `${point.x},${point.y}`;
  }).join(" ");

  const dataPoints = DIMENSIONS.map((dimension, index) => ({
    key: dimension.key,
    label: dimension.shortLabel,
    value: score[dimension.key],
    point: getPoint(index, score[dimension.key]),
    labelPoint: getPoint(index, maxScore + 1.2),
  }));

  return (
    <div className="radar-chart">
      <svg className="radar-svg" viewBox={`0 0 ${size} 320`} role="img" aria-label="五维能力雷达图">
        {gridPolygons.map((points, index) => (
          <polygon className="radar-grid" key={points} points={points} data-level={index + 1} />
        ))}

        {axisLines.map((line) => (
          <line className="radar-axis" key={line.id} x1={centerX} y1={centerY} x2={line.x} y2={line.y} />
        ))}

        <polygon className="radar-area" points={dataPolygon} />

        {dataPoints.map((item) => (
          <circle className="radar-point" cx={item.point.x} cy={item.point.y} key={item.key} r="4" />
        ))}

        {dataPoints.map((item) => (
          <text
            className="radar-label"
            key={`${item.key}-label`}
            textAnchor={item.labelPoint.x < centerX - 8 ? "end" : item.labelPoint.x > centerX + 8 ? "start" : "middle"}
            x={item.labelPoint.x}
            y={item.labelPoint.y}
          >
            <tspan x={item.labelPoint.x} dy="0">{DIMENSION_LABELS[item.key]}</tspan>
            <tspan className="radar-value" x={item.labelPoint.x} dy="15">{item.value}</tspan>
          </text>
        ))}
      </svg>
    </div>
  );
}
