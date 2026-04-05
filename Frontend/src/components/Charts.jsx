import { useState } from 'react';

/* Vibrant, high-contrast palettes for different chart types */
const PALETTE_VIBRANT = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff6348', '#2ed573'];
const pick = (i) => PALETTE_VIBRANT[i % PALETTE_VIBRANT.length];

/* Safe number coercion */
const num = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

/* ─── Bar Chart ─── */
const BarChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const values = (data.values || []).map(num);
  const labels = data.labels || [];
  const title = data.title || '';
  const maxVal = Math.max(...values, 1);

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <div className="flex items-end gap-2 h-[180px] px-2">
        {values.map((v, i) => {
          const pct = (v / maxVal) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end items-center relative"
              style={{ height: '160px' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-full rounded-t-md transition-all duration-200 hover:opacity-80"
                style={{ height: `${pct}%`, backgroundColor: pick(i), minHeight: 2 }}
              />
              {hovered === i && (
                <div className="absolute -top-5 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10">
                  {labels[i] || i}: {v}
                </div>
              )}
              <span className="text-[10px] text-gray-500 truncate max-w-full mt-1">{String(labels[i] || '')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Horizontal Bar Chart ─── */
const HBarChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const values = (data.values || []).map(num);
  const labels = data.labels || [];
  const title = data.title || '';
  const maxVal = Math.max(...values, 1);

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-[11px] text-gray-400 w-20 text-right truncate">{String(labels[i] || '')}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(v / maxVal) * 100}%`, backgroundColor: pick(i) }}
              />
            </div>
            <span className="text-[11px] text-gray-300 w-8">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Pie Chart ─── */
const pieSlicePath = (cx, cy, r, startAngle, endAngle) => {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
};

const PieChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const values = (data.values || []).map(num);
  const labels = data.labels || [];
  const title = data.title || '';
  const total = values.reduce((a, b) => a + b, 1);
  const r = 80;
  const cx = 120;
  const cy = 120;

  let cumAngle = -Math.PI / 2;

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <div className="flex items-center justify-center gap-6">
        <svg viewBox="0 0 240 240" className="w-44 h-44">
          {values.map((v, i) => {
            const slice = (v / total) * 2 * Math.PI;
            const start = cumAngle;
            const end = cumAngle + slice;
            cumAngle = end;
            const isHovered = hovered === i;
            return (
              <path
                key={i}
                d={pieSlicePath(cx, cy, isHovered ? r + 6 : r, start, end)}
                fill={pick(i)}
                className="transition-all duration-200"
                style={{ opacity: hovered !== null && hovered !== i ? 0.5 : 1 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        <div className="space-y-1">
          {labels.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: pick(i) }} />
              <span className="text-[11px] text-gray-300">{String(l || `Item ${i + 1}`)}</span>
              <span className="text-[11px] text-gray-500">({values[i]})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Donut Chart ─── */
const DonutChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const values = (data.values || []).map(num);
  const labels = data.labels || [];
  const title = data.title || '';
  const total = values.reduce((a, b) => a + b, 1);
  const outerR = 70;
  const innerR = 44;
  const cx = 120;
  const cy = 120;

  const donutSlice = (cx, cy, outerR, innerR, startAngle, endAngle) => {
    const ox1 = cx + outerR * Math.cos(startAngle);
    const oy1 = cy + outerR * Math.sin(startAngle);
    const ox2 = cx + outerR * Math.cos(endAngle);
    const oy2 = cy + outerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
  };

  let cumAngle = -Math.PI / 2;

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <div className="flex items-center justify-center gap-6">
        <svg viewBox="0 0 240 240" className="w-44 h-44">
          {values.map((v, i) => {
            const slice = (v / total) * 2 * Math.PI;
            const start = cumAngle;
            const end = cumAngle + slice;
            cumAngle = end;
            return (
              <path
                key={i}
                d={donutSlice(cx, cy, hovered === i ? outerR + 5 : outerR, innerR, start, end)}
                fill={pick(i)}
                className="transition-all duration-200"
                style={{ opacity: hovered !== null && hovered !== i ? 0.5 : 1 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="9">Total</text>
        </svg>
        <div className="space-y-1">
          {labels.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: pick(i) }} />
              <span className="text-[11px] text-gray-300">{String(l || `Item ${i + 1}`)}</span>
              <span className="text-[11px] text-gray-500">({values[i]})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Line Chart ─── */
const LineChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const values = (data.values || []).map(num);
  const labels = data.labels || [];
  const title = data.title || '';
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const w = 300;
  const h = 150;
  const pad = 30;

  const point = (i, v) => ({
    x: pad + (i / Math.max(values.length - 1, 1)) * (w - 2 * pad),
    y: pad + (1 - (v - minVal) / range) * (h - 2 * pad),
  });

  const linePath = values.map((v, i) => {
    const p = point(i, v);
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }).join(' ');

  const lastP = point(values.length - 1, minVal);
  const firstP = point(0, minVal);
  const areaPath = linePath + ` L ${lastP.x} ${h - pad} L ${firstP.x} ${h - pad} Z`;

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* area */}
        <path d={areaPath} fill="url(#lineGrad)" />
        {/* line */}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" />
        {/* dots */}
        {values.map((v, i) => {
          const p = point(i, v);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 3.5} fill="#818cf8"
                className="transition-all duration-150"
                style={{ strokeWidth: hovered === i ? 2 : 1, stroke: '#fff' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {hovered === i && (
                <>
                  <rect x={p.x - 22} y={p.y - 22} width={44} height={16} rx={4} fill="rgba(0,0,0,0.75)" />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fill="white" fontSize="10">{v}</text>
                </>
              )}
            </g>
          );
        })}
        {/* X labels */}
        {labels.map((l, i) => {
          const p = point(i, values[i]);
          return (
            <text key={i} x={p.x} y={h - 5} textAnchor="middle" fill="#4b5563" fontSize="8">{String(l || '')}</text>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Candlestick Chart ─── */
const CandlestickChart = ({ data }) => {
  const candles = (data.candles || []).map(c => ({
    open: num(c.open), close: num(c.close), high: num(c.high), low: num(c.low)
  }));
  const title = data.title || '';
  if (!candles.length) return null;

  const w = 320;
  const h = 160;
  const pad = 20;

  const allVals = candles.flatMap(c => [c.open, c.close, c.high, c.low]);
  const maxVal = Math.max(...allVals);
  const minVal = Math.min(...allVals);
  const range = maxVal - minVal || 1;

  const scaleY = (v) => pad + (1 - (v - minVal) / range) * (h - 2 * pad);
  const bw = (w - 2 * pad) / candles.length;

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
        {candles.map((c, i) => {
          const x = pad + i * bw + bw / 2;
          const bullish = c.close >= c.open;
          const color = bullish ? '#10b981' : '#ef4444';
          const bodyTop = scaleY(Math.max(c.open, c.close));
          const bodyBot = scaleY(Math.min(c.open, c.close));
          return (
            <g key={i}>
              <line x1={x} y1={scaleY(c.high)} x2={x} y2={scaleY(c.low)} stroke={color} strokeWidth="1" />
              <rect x={x - bw * 0.3} y={bodyTop} width={bw * 0.6} height={Math.max(bodyBot - bodyTop, 1)}
                fill={color} stroke={color} rx="0.5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Scatter Chart ─── */
const ScatterChart = ({ data }) => {
  const [hovered, setHovered] = useState(null);
  const points = (data.points || []).map(p => ({ x: num(p.x), y: num(p.y), label: p.label || '' }));
  const title = data.title || '';
  if (!points.length) return null;

  const w = 300;
  const h = 150;
  const pad = 30;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const pos = (p) => ({
    x: pad + ((p.x - minX) / rangeX) * (w - 2 * pad),
    y: pad + (1 - (p.y - minY) / rangeY) * (h - 2 * pad),
  });

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {title && <p className="text-sm font-semibold text-white mb-2">{title}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
        {points.map((p, i) => {
          const { x, y } = pos(p);
          return (
            <circle key={i} cx={x} cy={y} r={hovered === i ? 5 : 3.5}
              fill={pick(i)} className="transition-all duration-150"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            >
              {p.label && (
                <title>{p.label}: ({p.x}, {p.y})</title>
              )}
            </circle>
          );
        })}
      </svg>
    </div>
  );
};

/* ─── Main Chart Component ─── */
const CHART_TYPES = {
  bar: BarChart,
  hbar: HBarChart,
  'horizontal-bar': HBarChart,
  pie: PieChart,
  donut: DonutChart,
  line: LineChart,
  'line-chart': LineChart,
  candlestick: CandlestickChart,
  scatter: ScatterChart,
};

const ChartView = ({ data }) => {
  if (!data || typeof data !== 'object') {
    return <div className="my-4 text-red-400 text-xs">Invalid chart data</div>;
  }
  const ChartComp = CHART_TYPES[data.type] || BarChart;
  return <ChartComp data={data} />;
};

export { ChartView, BarChart, PieChart, DonutChart, LineChart, HBarChart, CandlestickChart, ScatterChart };
export default ChartView;
