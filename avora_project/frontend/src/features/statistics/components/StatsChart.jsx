import React, { useMemo, useState } from 'react';
import './StatsChart.css';

export const CHART_COLORS = [
  '#2563eb', '#059669', '#c9a227', '#7c3aed', '#dc2626',
  '#0891b2', '#ea580c', '#64748b', '#db2777', '#65a30d',
];

const WIDTH = 640;
const HEIGHT = 340;
const PAD = { top: 20, right: 16, bottom: 56, left: 64 };

const niceMax = (value) => {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

const shorten = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const compact = (value) => {
  if (value >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(value);
};

const polar = (cx, cy, r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

/**
 * Dependency-free SVG chart. `type`: 'bar' | 'pie'.
 * `data`: [{ label, value }]
 */
const StatsChart = ({ type, data, formatValue }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const items = useMemo(() => (data || []).filter((d) => Number(d.value) >= 0), [data]);
  const total = items.reduce((sum, d) => sum + Number(d.value), 0);

  if (items.length === 0 || total === 0) {
    return <div className="st-chart st-chart--empty">Chưa có dữ liệu trong khoảng thời gian đã chọn.</div>;
  }

  const active = activeIndex !== null ? items[activeIndex] : null;
  const readout = active
    ? `${active.label}: ${formatValue(active.value)}${type === 'pie' ? ` (${((active.value / total) * 100).toFixed(1)}%)` : ''}`
    : 'Rê chuột vào biểu đồ để xem chi tiết';

  let svg;
  if (type === 'pie') {
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const r = 130;
    let angle = -Math.PI / 2;
    const slices = items.filter((d) => d.value > 0);

    svg = (
      <g>
        {slices.length === 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={CHART_COLORS[items.indexOf(slices[0]) % CHART_COLORS.length]} />
        ) : (
          slices.map((d) => {
            const idx = items.indexOf(d);
            const sweep = (d.value / total) * Math.PI * 2;
            const [x1, y1] = polar(cx, cy, r, angle);
            const [x2, y2] = polar(cx, cy, r, angle + sweep);
            const large = sweep > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            angle += sweep;
            return (
              <path
                key={d.label}
                d={path}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                stroke="#ffffff"
                strokeWidth="2"
                opacity={activeIndex === null || activeIndex === idx ? 1 : 0.45}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </path>
            );
          })
        )}
        <circle cx={cx} cy={cy} r={62} fill="#ffffff" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="st-chart__center-value">{formatValue(total)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="st-chart__center-label">Tổng</text>
      </g>
    );
  } else {
    const max = niceMax(Math.max(...items.map((d) => Number(d.value))));
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const slot = innerW / items.length;
    const barW = Math.min(48, slot * 0.62);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
    const labelEvery = Math.ceil(items.length / 14);
    const maxLabel = items.length > 8 ? 6 : 12;

    svg = (
      <g>
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="st-chart__grid" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="st-chart__tick">{compact(t)}</text>
            </g>
          );
        })}
        {items.map((d, i) => {
          const h = (Number(d.value) / max) * innerH;
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const y = PAD.top + innerH - h;
          return (
            <g key={d.label + i} onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 0)}
                rx="3"
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
              >
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </rect>
              {i % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={HEIGHT - PAD.bottom + 18}
                  textAnchor="middle"
                  className="st-chart__tick"
                >
                  {shorten(d.label, maxLabel)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <div className="st-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={type === 'pie' ? 'Biểu đồ tròn' : 'Biểu đồ cột'}>
        {svg}
      </svg>
      <div className="st-chart__readout" aria-live="polite">{readout}</div>
    </div>
  );
};

export default StatsChart;
