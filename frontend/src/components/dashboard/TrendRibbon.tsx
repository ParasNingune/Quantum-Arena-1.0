'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function getBarColor(status: string, severity: string): string {
  if (status === 'normal') return '#34A853';
  if (severity === 'mild') return '#F59E0B';
  if (severity === 'moderate') return '#F87171';
  return '#EF4444';
}

function getStatusLabel(status: string, severity: string): string {
  if (status === 'normal') return 'Normal';
  if (severity === 'mild') return 'Mild';
  return 'Abnormal';
}

function getDeviationScore(test: any): number {
  const deviationValue = Number(test.deviation_pct);
  if (Number.isFinite(deviationValue) && Math.abs(deviationValue) > 0) {
    return Math.min(100, Math.abs(deviationValue));
  }

  const gaugePosition = Number(test.gauge_position);
  if (Number.isFinite(gaugePosition) && gaugePosition >= 0 && gaugePosition <= 1) {
    return Math.min(100, Math.abs(gaugePosition - 0.5) * 200);
  }

  if (test.status === 'normal') return 10;
  if (test.severity === 'mild') return 35;
  if (test.severity === 'moderate') return 65;
  return 85;
}

function truncateName(name: string, maxLen: number = 10): string {
  return name.length > maxLen ? name.substring(0, maxLen) + '…' : name;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="zen-glass-solid p-3" style={{ borderRadius: '12px', maxWidth: '200px' }}>
        <p className="font-semibold text-xs mb-1" style={{ color: 'var(--zen-text)' }}>{d.fullName}</p>
        <p className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>
          <span className="font-bold" style={{ color: 'var(--zen-text)' }}>{d.value}</span> {d.unit}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--zen-text-muted)' }}>Status: {d.statusLabel}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--zen-text-muted)' }}>Distance from normal: {Math.round(d.deviationScore)}%</p>
        <p className="text-xs mt-1" style={{ color: 'var(--zen-text-faint)' }}>Ref: {d.reference_range || '—'}</p>
      </div>
    );
  }
  return null;
};

export default function TrendRibbon({ tests }: { tests: any[] }) {
  if (!tests || tests.length === 0) return null;

  const chartData = tests.slice(0, 12).map((t: any) => ({
    name: truncateName(t.test_name, 12),
    fullName: t.test_name,
    value: t.value,
    unit: t.unit,
    reference_range: t.reference_range,
    deviationScore: getDeviationScore(t),
    statusLabel: getStatusLabel(t.status, t.severity),
    barColor: getBarColor(t.status, t.severity),
    barHeight: Math.max(8, getDeviationScore(t)),
  }));

  return (
    <div className="zen-glass-solid p-6">
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--zen-text)' }}>Test Overview</h3>
      <p className="text-xs mb-5" style={{ color: 'var(--zen-text-faint)' }}>
        Higher bars mean the test is further away from the expected range
      </p>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barCategoryGap="18%">
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 10 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="barHeight" radius={[8, 8, 0, 0]} maxBarSize={28}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34A853' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>Mild</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>Abnormal</span>
        </div>
      </div>
    </div>
  );
}
