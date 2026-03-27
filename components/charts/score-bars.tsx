import { scoreClass } from "@/lib/result-display";
import type { PracticeSession } from "@/lib/types";

const DIMENSIONS: Array<{
  key: keyof PracticeSession["score"];
  label: string;
}> = [
  { key: "fluencyCoherence", label: "流利度" },
  { key: "lexicalResource", label: "词汇" },
  { key: "grammar", label: "语法" },
  { key: "pronunciation", label: "发音" },
  { key: "completeness", label: "完整度" },
];

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function ScoreBars({ score }: { score: PracticeSession["score"] }) {
  return (
    <div className="dimension-bars">
      {DIMENSIONS.map((dimension) => {
        const value = score[dimension.key];
        const width = Math.max((value / 9) * 100, 4);
        const tone = scoreClass(value);

        return (
          <div className="dimension-bar-row" key={dimension.key}>
            <span className="dimension-bar-label">{dimension.label}</span>
            <svg className="dimension-bar-chart" viewBox="0 0 100 12" preserveAspectRatio="none" role="img" aria-label={`${dimension.label} ${value}分`}>
              <rect className="dimension-bar-bg" height="12" rx="6" width="100" x="0" y="0" />
              <rect className={`dimension-bar-fill ${tone}`} height="12" rx="6" width={width} x="0" y="0" />
            </svg>
            <span className={`dimension-bar-score ${tone}`}>{formatScore(value)}</span>
          </div>
        );
      })}
    </div>
  );
}
