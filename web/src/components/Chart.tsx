// Zaman serisi grafiği (bağımlılıksız SVG). Çizgi stili veri türünü kodlar:
//   canlı arama → düz çizgi, aramasız model bilgisi → kesik çizgi, simülasyon → noktalı + taralı bant.
import type { MeasurementType } from "../lib/data";
import { formatDate, pct, type RunPoint } from "../lib/report";
import { L } from "../lib/i18n";

const sameDay = (pts: RunPoint[]) => new Set(pts.map((p) => p.at.slice(0, 10))).size < pts.length;
const tickLabel = (iso: string, withTime: boolean) =>
  withTime ? new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : formatDate(iso);

const W = 340, H = 180, PAD = { l: 34, r: 12, t: 12, b: 28 };

export function TrendChart({ points, type, metric }: { points: RunPoint[]; type: MeasurementType; metric: "recommend" | "mention" }) {
  if (points.length === 0) return null;
  const xs = (i: number) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const ys = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
  const vals = points.map((p) => p[metric]);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v.value).toFixed(1)}`).join(" ");
  const band = vals.length > 1
    ? `M${vals.map((v, i) => `${xs(i).toFixed(1)},${ys(v.high).toFixed(1)}`).join(" L")} L${[...vals].reverse().map((v, j) => `${xs(vals.length - 1 - j).toFixed(1)},${ys(v.low).toFixed(1)}`).join(" L")} Z`
    : "";
  const dash = type === "model_knowledge" ? "6 5" : type === "simulated" ? "1.5 4" : undefined;
  const label = metric === "recommend" ? L("önerilme oranı", "recommendation rate") : L("anılma oranı", "mention rate");
  const ticks = labelIndexes(points.length);
  const withTime = sameDay(points);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${L("Zaman içinde", "Over time,")} ${label}: ${vals.map((v, i) => `${formatDate(points[i].at)} ${pct(v.value)}`).join(", ")}`}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--sim)" strokeWidth="1.5" opacity=".35" />
          </pattern>
        </defs>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={ys(g)} y2={ys(g)} className="chart-grid" />
            <text x={PAD.l - 6} y={ys(g) + 4} className="chart-axis" textAnchor="end">{pct(g)}</text>
          </g>
        ))}
        {band && <path d={band} className={type === "simulated" ? "chart-band-sim" : "chart-band"} />}
        <path d={line} className={`chart-line chart-${type}`} strokeDasharray={dash} />
        {vals.map((v, i) => (
          <circle key={i} cx={xs(i)} cy={ys(v.value)} r={4} className={`chart-dot chart-${type}`}>
            <title>{`${formatDate(points[i].at)}: ${pct(v.value)} (${v.k}/${v.n} ${L("cevap, aralık", "answers, range")} ${pct(v.low)}–${pct(v.high)})`}</title>
          </circle>
        ))}
        {ticks.map((i) => (
          <text key={i} x={xs(i)} y={H - 8} className="chart-axis" textAnchor={i === 0 && points.length > 1 ? "start" : i === points.length - 1 && points.length > 1 ? "end" : "middle"}>{tickLabel(points[i].at, withTime)}</text>
        ))}
      </svg>
      <figcaption>
        <span className={`legend-line legend-${type}`} aria-hidden /> {label}
        {points.length > 1 && <>{L(". Gölgeli alan %95 güven aralığıdır.", ". Shaded area is the 95% confidence range.")}</>}
      </figcaption>
    </figure>
  );
}

function labelIndexes(n: number): number[] {
  if (n <= 4) return [...Array(n).keys()];
  return [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1];
}

/** Rakip karşılaştırması: yatay çubuklar (yüzde, sayı ve güven aralığı birlikte). */
export function CompareBars({ rows, type }: { rows: { name: string; isTarget: boolean; value: number; detail: string }[]; type: MeasurementType }) {
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.name} className={r.isTarget ? "bar-target" : ""}>
          <div className="bar-head"><span className="bar-name">{r.name}{r.isTarget && <em> {L("(siz)", "(you)")}</em>}</span><span className="num">{pct(r.value)}</span></div>
          <div className="bar-track"><div className={`bar-fill bar-${type}`} style={{ width: `${Math.max(r.value * 100, 1)}%` }} /></div>
          <span className="bar-detail">{r.detail}</span>
        </li>
      ))}
    </ul>
  );
}
