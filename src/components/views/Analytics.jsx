import { useState, useMemo } from 'react';
import { useStore } from '../../store.js';
import * as db from '../../db/index.js';
import { TrendingUp, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const fmtK = (n) => {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};

const fmt$ = (n) =>
  `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-white/15 rounded-xl px-md py-sm shadow-xl text-xs space-y-xs">
      <p className="text-text-tertiary font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-bold">
          {fmt$(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Analytics Page ─────────────────────────────────────────────────────────────
const Analytics = () => {
  const agencies = useStore(s => s.agencies);
  const creators = useStore(s => s.creators);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [dateRange,      setDateRange]      = useState('6mo');

  const activeAgency   = selectedAgency ?? agencies[0]?.id ?? null;
  const activeCreators = creators.filter(c => c.agency_id === activeAgency && c.is_active);

  // ── Date range → start / end ISO strings ──────────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    const end   = new Date();
    const start = new Date();
    if      (dateRange === '30d')  start.setDate(end.getDate() - 30);
    else if (dateRange === '3mo')  start.setMonth(end.getMonth() - 3);
    else if (dateRange === '6mo')  start.setMonth(end.getMonth() - 6);
    else { start.setMonth(0); start.setDate(1); }           // this year
    return {
      startDate: start.toISOString().split('T')[0],
      endDate:   end.toISOString().split('T')[0],
    };
  }, [dateRange]);

  // ── Chart 1: Monthly Revenue Trend ────────────────────────────────────────
  const monthlyTrendData = useMemo(() => {
    if (!activeAgency) return [];
    const result = [];
    const cur = new Date(startDate + 'T12:00:00');
    cur.setDate(1); // floor to month start
    const endD = new Date(endDate + 'T12:00:00');
    while (cur <= endD) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const mm = String(m).padStart(2, '0');
      result.push({
        label:   `${MONTH_NAMES[m - 1]}${y !== new Date().getFullYear() ? ` '${String(y).slice(2)}` : ''}`,
        revenue: db.getAgencyRevenueForDateRange(activeAgency, `${y}-${mm}-01`, `${y}-${mm}-31`),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }, [activeAgency, startDate, endDate]);

  // ── Chart 2: Creator Leaderboard (current month, top 10) ──────────────────
  const leaderboardData = useMemo(() => {
    const now = new Date();
    const y   = now.getFullYear();
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    const monthStart = `${y}-${mm}-01`;
    const monthEnd   = `${y}-${mm}-31`;
    return activeCreators
      .map(creator => {
        const earnings = db.getEarningsForCreatorDateRange(creator.id, monthStart, monthEnd);
        return { name: creator.stage_name, revenue: earnings.reduce((s, e) => s + e.amount, 0) };
      })
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [activeCreators]);

  // ── Chart 3: Day of Week Analysis ─────────────────────────────────────────
  const dayOfWeekData = useMemo(() => {
    const dayTotals  = Array(7).fill(0);
    const dayCounts  = Array(7).fill(0);

    activeCreators.forEach(creator => {
      const earnings = db.getEarningsForCreatorDateRange(creator.id, startDate, endDate);
      earnings.forEach(e => {
        const dow = new Date(e.date + 'T12:00:00').getDay(); // 0=Sun…6=Sat
        const idx = dow === 0 ? 6 : dow - 1;                // 0=Mon…6=Sun
        dayTotals[idx] += e.amount;
        dayCounts[idx]++;
      });
    });

    return DAY_NAMES.map((day, i) => ({
      day,
      avg: dayCounts[i] > 0 ? Math.round(dayTotals[i] / dayCounts[i]) : 0,
    }));
  }, [activeCreators, startDate, endDate]);

  // ── Chart 4: Daily Revenue (capped at 90 days) ────────────────────────────
  const dailyData = useMemo(() => {
    const end   = new Date(endDate + 'T12:00:00');
    const start = new Date(startDate + 'T12:00:00');
    const maxMs = 90 * 86400000;
    const actualStart = new Date(Math.max(start.getTime(), end.getTime() - maxMs));
    const result = [];
    const cur = new Date(actualStart);
    while (cur <= end) {
      const dateIso = cur.toISOString().split('T')[0];
      const total = activeCreators.reduce((sum, creator) => {
        const e = db.getEarningsForCreator(creator.id, dateIso);
        return sum + (e?.amount || 0);
      }, 0);
      result.push({
        date:    `${cur.getMonth() + 1}/${cur.getDate()}`,
        revenue: total,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [activeCreators, startDate, endDate]);

  // ── KPI Summary ──────────────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const total   = dailyData.reduce((s, d) => s + d.revenue, 0);
    const bestDay = dailyData.reduce((b, d) => d.revenue > (b?.revenue ?? 0) ? d : b, null);
    const daysOn  = dailyData.filter(d => d.revenue > 0).length;
    const avg     = daysOn > 0 ? total / daysOn : 0;
    const bestDowIdx = dayOfWeekData.reduce((bi, d, i) => d.avg > (dayOfWeekData[bi]?.avg ?? 0) ? i : bi, 0);
    return { total, bestDay, avg, bestWeekday: dayOfWeekData[bestDowIdx]?.avg > 0 ? DAY_NAMES[bestDowIdx] : '—' };
  }, [dailyData, dayOfWeekData]);

  const hasAnyData =
    monthlyTrendData.some(d => d.revenue > 0) ||
    leaderboardData.length > 0;

  const tickStyle = { fill: '#8888aa', fontSize: 10 };
  const gridProps = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };

  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">

      {/* Header */}
      <div className="flex items-center gap-md">
        <TrendingUp size={32} className="text-accent-cyan" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent">Analytics</h1>
      </div>

      {/* Controls: agency tabs + date range */}
      <div className="flex flex-wrap items-center justify-between gap-md">
        {/* Agency tabs */}
        <div className="flex items-center gap-sm flex-wrap">
          {agencies.map(agency => {
            const isActive = agency.id === activeAgency;
            return (
              <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
                className={`px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white border-transparent shadow-glow'
                    : 'bg-white/5 text-text-secondary border-white/10 hover:text-text-primary hover:bg-white/10'
                }`}>
                {agency.name}
              </button>
            );
          })}
          {agencies.length === 0 && (
            <p className="text-text-tertiary text-sm">No agencies yet.</p>
          )}
        </div>

        {/* Date range pills */}
        <div className="flex items-center gap-xs bg-bg-tertiary/40 border border-white/8 rounded-xl p-xs">
          {[
            { key: '30d',  label: 'Last 30d' },
            { key: '3mo',  label: '3 Months' },
            { key: '6mo',  label: '6 Months' },
            { key: 'year', label: 'This Year' },
          ].map(r => (
            <button key={r.key} onClick={() => setDateRange(r.key)}
              className={`px-md py-xs rounded-lg text-xs font-semibold transition-all ${
                dateRange === r.key
                  ? 'bg-accent-cyan/80 text-white shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Strip */}
      {hasAnyData && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-md">
          {[
            { label: 'Total Revenue',   value: fmt$(kpiStats.total),                                        sub: null,                   color: 'text-accent-cyan',   grad: 'from-accent-cyan/10'   },
            { label: 'Best Single Day', value: kpiStats.bestDay ? fmt$(kpiStats.bestDay.revenue) : '—',     sub: kpiStats.bestDay?.date, color: 'text-accent-purple', grad: 'from-accent-purple/10' },
            { label: 'Daily Average',   value: fmt$(kpiStats.avg),                                          sub: null,                   color: 'text-accent-pink',   grad: 'from-accent-pink/10'   },
            { label: 'Best Weekday',    value: kpiStats.bestWeekday,                                        sub: null,                   color: 'text-accent-lime',   grad: 'from-accent-lime/10'   },
          ].map(({ label, value, sub, color, grad }) => (
            <div key={label} className={`bg-gradient-to-br ${grad} to-transparent border border-white/8 rounded-2xl p-lg`}>
              <p className="text-[11px] text-text-tertiary/60 font-medium uppercase tracking-wider mb-xs">{label}</p>
              <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              {sub && <p className="text-[10px] text-text-tertiary/50 mt-xs font-mono">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData ? (
        <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
          <BarChart3 size={40} className="mx-auto text-text-tertiary/25 mb-md" />
          <p className="text-text-tertiary">No revenue data yet for this agency.</p>
          <p className="text-text-tertiary/50 text-sm mt-xs">
            Enter daily revenue in Revenue Master to see analytics here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">

          {/* Chart 1 — Monthly Trend */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-lg space-y-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Monthly Revenue</h3>
                <p className="text-[11px] text-text-tertiary/60">Total revenue per month</p>
              </div>
              <span className="text-sm font-black font-mono text-accent-cyan">{fmtK(monthlyTrendData.reduce((s,d)=>s+d.revenue,0))}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrendData} barSize={Math.max(8, Math.min(24, 120 / monthlyTrendData.length))}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={tickStyle} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#00d9ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2 — Creator Leaderboard */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-lg space-y-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Creator Leaderboard</h3>
                <p className="text-[11px] text-text-tertiary/60">Current month earnings (top 10)</p>
              </div>
              {leaderboardData.length > 0 && (
                <span className="text-sm font-black font-mono text-accent-purple">{fmtK(leaderboardData.reduce((s,d)=>s+d.revenue,0))}</span>
              )}
            </div>
            {leaderboardData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-text-tertiary/40 text-sm">
                No earnings this month yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={leaderboardData}
                  layout="vertical"
                  barSize={Math.max(6, Math.min(14, 140 / leaderboardData.length))}
                >
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtK} tick={tickStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fill: '#ccccdd', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    width={76}
                    tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#9d4edd" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 3 — Daily Revenue */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-lg space-y-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Daily Revenue</h3>
                <p className="text-[11px] text-text-tertiary/60">Total agency revenue per day (up to 90 days)</p>
              </div>
              <span className="text-sm font-black font-mono text-accent-pink">{fmtK(kpiStats.total)}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff006e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff006e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="date"
                  tick={{ ...tickStyle, fontSize: 9 }}
                  axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(dailyData.length / 8) - 1)}
                />
                <YAxis tickFormatter={fmtK} tick={tickStyle} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="revenue" name="Revenue"
                  stroke="#ff006e" fill="url(#areaGrad)"
                  strokeWidth={2} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4 — Day of Week */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-lg space-y-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Best Day of Week</h3>
                <p className="text-[11px] text-text-tertiary/60">Average revenue by day of week</p>
              </div>
              <span className="text-sm font-black font-mono text-accent-lime">{kpiStats.bestWeekday}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayOfWeekData} barSize={28}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" tick={{ ...tickStyle, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={tickStyle} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="avg" name="Avg Revenue" fill="#00ff88" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
