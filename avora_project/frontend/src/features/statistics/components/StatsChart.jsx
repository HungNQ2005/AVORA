import React, { useMemo, useState } from 'react';
import './StatsChart.css';

export const CHART_COLORS = [
  '#2563eb', '#059669', '#c9a227', '#7c3aed', '#dc2626',
  '#0891b2', '#ea580c', '#64748b', '#db2777', '#65a30d',
];

const WIDTH = 680;
const HEIGHT = 360;
const PAD = { top: 32, right: 28, bottom: 88, left: 68 };

const niceMax = (value) => {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

const shorten = (text = '', max = 16) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const compact = (value) => {
  if (value >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(value);
};

const polar = (cx, cy, r, angle) => [
  cx + r * Math.cos(angle),
  cy + r * Math.sin(angle),
];

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
    : 'Rê chuột vào các cột hoặc lát cắt để xem chi tiết';

  let svg;
  if (type === 'pie') {
    const cx = WIDTH / 2;
    const cy = 175;
    const r = 100;
    const rInner = 56;
    const slices = items.filter((d) => d.value > 0);

    // 1. Compute geometry for each slice
    let curAngle = -Math.PI / 2;
    const computedSlices = slices.map((d) => {
      const idx = items.indexOf(d);
      const sweep = (d.value / total) * Math.PI * 2;
      const startAngle = curAngle;
      const midAngle = curAngle + sweep / 2;
      const pct = ((d.value / total) * 100).toFixed(1);
      curAngle += sweep;
      return { d, idx, startAngle, sweep, midAngle, pct };
    });

    // 2. Compute callout label positions with collision avoidance
    const rightSlices = [];
    const leftSlices = [];

    computedSlices.forEach((slice) => {
      const [x1, y1] = polar(cx, cy, r + 4, slice.midAngle);
      const [x2, y2] = polar(cx, cy, r + 18, slice.midAngle);
      const isRight = Math.cos(slice.midAngle) >= 0;
      const item = { ...slice, x1, y1, x2, y2, isRight, yEnd: y2 };
      if (isRight) {
        rightSlices.push(item);
      } else {
        leftSlices.push(item);
      }
    });

    // Sort right side top-to-bottom and adjust vertical spacing
    rightSlices.sort((a, b) => a.y2 - b.y2);
    let lastRightY = -Infinity;
    rightSlices.forEach((item) => {
      if (item.yEnd - lastRightY < 24) {
        item.yEnd = lastRightY + 24;
      }
      lastRightY = item.yEnd;
      item.x3 = item.x2 + 14;
      item.textX = item.x3 + 6;
      item.textAnchor = 'start';
    });

    // Sort left side top-to-bottom and adjust vertical spacing
    leftSlices.sort((a, b) => a.y2 - b.y2);
    let lastLeftY = -Infinity;
    leftSlices.forEach((item) => {
      if (item.yEnd - lastLeftY < 24) {
        item.yEnd = lastLeftY + 24;
      }
      lastLeftY = item.yEnd;
      item.x3 = item.x2 - 14;
      item.textX = item.x3 - 6;
      item.textAnchor = 'end';
    });

    const allCallouts = [...rightSlices, ...leftSlices];

    svg = (
      <g>
        {/* Slices */}
        {slices.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={CHART_COLORS[items.indexOf(slices[0]) % CHART_COLORS.length]}
          />
        ) : (
          computedSlices.map((slice) => {
            const { d, idx, startAngle, sweep } = slice;
            const [x1, y1] = polar(cx, cy, r, startAngle);
            const [x2, y2] = polar(cx, cy, r, startAngle + sweep);
            const large = sweep > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const isHighlighted = activeIndex === null || activeIndex === idx;

            return (
              <path
                key={d.label + idx}
                d={path}
                fill={color}
                stroke="#ffffff"
                strokeWidth="2.5"
                opacity={isHighlighted ? 1 : 0.35}
                className="st-chart__slice-wedge"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <title>{`${d.label}: ${formatValue(d.value)} (${slice.pct}%)`}</title>
              </path>
            );
          })
        )}

        {/* Center Donut Hole with dynamic interactive text */}
        <circle cx={cx} cy={cy} r={rInner} fill="#ffffff" />
        {active ? (
          <g className="st-chart__center-info" pointerEvents="none">
            <circle cx={cx} cy={cy} r={rInner - 2} fill="#f8fafc" />
            <text
              x={cx}
              y={cy - 14}
              textAnchor="middle"
              className="st-chart__center-hover-title"
              fill={CHART_COLORS[activeIndex % CHART_COLORS.length]}
            >
              {shorten(active.label, 14)}
            </text>
            <text x={cx} y={cy + 5} textAnchor="middle" className="st-chart__center-hover-val">
              {formatValue(active.value)}
            </text>
            <text x={cx} y={cy + 22} textAnchor="middle" className="st-chart__center-hover-pct">
              {((active.value / total) * 100).toFixed(1)}%
            </text>
          </g>
        ) : (
          <g className="st-chart__center-info" pointerEvents="none">
            <text x={cx} y={cy - 4} textAnchor="middle" className="st-chart__center-value">
              {formatValue(total)}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" className="st-chart__center-label">
              Tổng cộng
            </text>
          </g>
        )}

        {/* Name and percentage labels directly on/around the slices */}
        {allCallouts.map((item) => {
          const color = CHART_COLORS[item.idx % CHART_COLORS.length];
          const isHighlighted = activeIndex === null || activeIndex === item.idx;

          return (
            <g
              key={'label-' + item.d.label + item.idx}
              className="st-chart__callout"
              opacity={isHighlighted ? 1 : 0.35}
              onMouseEnter={() => setActiveIndex(item.idx)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Leader polyline */}
              <polyline
                points={`${item.x1},${item.y1} ${item.x2},${item.y2} ${item.x3},${item.yEnd}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                opacity={0.85}
              />
              <circle cx={item.x1} cy={item.y1} r="2.5" fill={color} />

              {/* Slice Name */}
              <text
                x={item.textX}
                y={item.yEnd - 3}
                textAnchor={item.textAnchor}
                className="st-chart__slice-name"
                fill={color}
              >
                {shorten(item.d.label, 18)}
              </text>

              {/* Slice Value & Percentage */}
              <text
                x={item.textX}
                y={item.yEnd + 11}
                textAnchor={item.textAnchor}
                className="st-chart__slice-val"
              >
                {formatValue(item.d.value)} ({item.pct}%)
              </text>
            </g>
          );
        })}
      </g>
    );
  } else {
    // ─── Bar Chart with visible names & top values ───
    const max = niceMax(Math.max(...items.map((d) => Number(d.value))));
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const slot = innerW / items.length;
    const barW = Math.min(46, Math.max(12, slot * 0.65));
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

    // Label interval for very large ranges (e.g. 30 days)
    const isLargeRange = items.length > 16;
    const labelEvery = isLargeRange ? Math.ceil(items.length / 12) : 1;

    svg = (
      <g>
        {/* Background Grid Lines & Ticks */}
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="st-chart__grid" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="st-chart__tick">
                {compact(t)}
              </text>
            </g>
          );
        })}

        {/* Bars and Data Labels */}
        {items.map((d, i) => {
          const h = max > 0 ? (Number(d.value) / max) * innerH : 0;
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const y = PAD.top + innerH - h;
          const isHighlighted = activeIndex === null || activeIndex === i;
          const color = CHART_COLORS[i % CHART_COLORS.length];

          // Determine label display format
          const shouldShowLabel = i % labelEvery === 0 || activeIndex === i;
          const isRotated = items.length > 5 || d.label.length > 8;
          const labelY = HEIGHT - PAD.bottom + 18;

          return (
            <g
              key={d.label + i}
              className="st-chart__bar-group"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* The Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 0)}
                rx="4"
                fill={color}
                opacity={isHighlighted ? 1 : 0.35}
                className="st-chart__bar-rect"
              >
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </rect>

              {/* Value on top of each bar */}
              {Number(d.value) > 0 && (
                <text
                  x={x + barW / 2}
                  y={Math.max(y - 7, PAD.top + 8)}
                  textAnchor="middle"
                  className="st-chart__bar-val"
                  opacity={isHighlighted ? 1 : 0.3}
                >
                  {compact(d.value)}
                </text>
              )}

              {/* Name label under the bar (Trục X) */}
              {shouldShowLabel && (
                isRotated ? (
                  <text
                    x={x + barW / 2}
                    y={labelY}
                    textAnchor="end"
                    transform={`rotate(-32, ${x + barW / 2}, ${labelY})`}
                    className="st-chart__tick st-chart__tick--rotated"
                    fill={activeIndex === i ? '#1e40af' : '#334155'}
                    fontWeight={activeIndex === i ? '700' : '600'}
                  >
                    {shorten(d.label, items.length > 12 ? 14 : 22)}
                  </text>
                ) : (
                  <text
                    x={x + barW / 2}
                    y={labelY + 2}
                    textAnchor="middle"
                    className="st-chart__tick"
                    fill={activeIndex === i ? '#1e40af' : '#334155'}
                    fontWeight={activeIndex === i ? '700' : '600'}
                  >
                    {d.label}
                  </text>
                )
              )}
            </g>
          );
        })}

        {/* Floating tooltip badge when hovering a bar */}
        {active && activeIndex !== null && (
          (() => {
            const i = activeIndex;
            const d = active;
            const h = max > 0 ? (Number(d.value) / max) * innerH : 0;
            const x = PAD.left + slot * i + (slot - barW) / 2;
            const y = PAD.top + innerH - h;
            const badgeText = `${d.label}: ${formatValue(d.value)}`;
            const badgeW = Math.min(260, Math.max(140, badgeText.length * 7.5 + 20));
            const badgeH = 26;
            const badgeX = Math.max(PAD.left, Math.min(WIDTH - PAD.right - badgeW, x + barW / 2 - badgeW / 2));
            const badgeY = Math.max(PAD.top - 20, y - 36);

            return (
              <g className="st-chart__floating-badge" pointerEvents="none">
                <rect
                  x={badgeX}
                  y={badgeY}
                  width={badgeW}
                  height={badgeH}
                  rx="6"
                  className="st-chart__tooltip-rect"
                />
                <text
                  x={badgeX + badgeW / 2}
                  y={badgeY + 17}
                  textAnchor="middle"
                  className="st-chart__tooltip-text"
                >
                  {badgeText}
                </text>
              </g>
            );
          })()
        )}
      </g>
    );
  }

  return (
    <div className="st-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={type === 'pie' ? 'Biểu đồ tròn' : 'Biểu đồ cột'}
      >
        {svg}
      </svg>
      <div className="st-chart__readout" aria-live="polite">
        {readout}
      </div>
    </div>
  );
};

export default StatsChart;
