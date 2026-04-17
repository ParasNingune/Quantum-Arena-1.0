'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--zen-normal-accent)';
  if (score >= 60) return 'var(--zen-mild-accent)';
  return 'var(--zen-critical-accent)';
}

function scoreGradient(score: number): string {
  if (score >= 80) return 'url(#gaugeGradGood)';
  if (score >= 60) return 'url(#gaugeGradFair)';
  return 'url(#gaugeGradPoor)';
}

function gradeLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Attention';
}

function gradeEmoji(score: number): string {
  if (score >= 90) return '🌟';
  if (score >= 80) return '💚';
  if (score >= 60) return '⚡';
  return '⚠️';
}

/* Map severity to category labels */
function getCategoryStatus(tests: any[]): { label: string; status: string }[] {
  const categories: Record<string, string[]> = {};
  tests.forEach((t: any) => {
    const cat = t.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t.severity || t.status || 'normal');
  });

  return Object.entries(categories).map(([cat, severities]) => {
    const worst = severities.includes('critical')
      ? 'critical'
      : severities.includes('moderate')
        ? 'moderate'
        : severities.includes('mild')
          ? 'mild'
          : 'normal';

    const label = worst === 'normal' ? 'Normal' : worst === 'mild' ? 'Slightly Off' : 'Needs Attention';
    return { label: `${cat}: ${label}`, status: worst };
  });
}

export default function HealthScoreGauge({ data }: { data: any }) {
  const [animScore, setAnimScore] = useState(0);
  const score = data.health_score ?? 0;
  const color = scoreColor(score);

  useEffect(() => {
    let start = 0;
    const duration = 1400;
    const inc = score / (duration / 16);
    const timer = setInterval(() => {
      start += inc;
      if (start >= score) {
        setAnimScore(score);
        clearInterval(timer);
      } else {
        setAnimScore(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 80;
  const circumference = Math.PI * radius; // semi-circle
  const offset = circumference - (score / 100) * circumference;

  const tests = data.all_tests || data.tests || [];
  const categoryStatuses = getCategoryStatus(tests);

  return (
    <div className="zen-glass-solid p-8 md:p-10 text-center">
      {/* Gradient defs */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gaugeGradGood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34A853" />
            <stop offset="100%" stopColor="#81C784" />
          </linearGradient>
          <linearGradient id="gaugeGradFair" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="gaugeGradPoor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
        </defs>
      </svg>

      {/* Arc Gauge */}
      <div className="relative w-52 h-28 mx-auto mb-6">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Fill */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={scoreGradient(score)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-1">
          <span className="text-5xl font-bold" style={{ color: 'var(--zen-text)' }}>{animScore}</span>
          <span className="text-sm font-semibold mt-0.5" style={{ color }}>{gradeEmoji(score)} {gradeLabel(score)}</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed max-w-xl mx-auto mb-6" style={{ color: 'var(--zen-text-muted)' }}>
        {data.health_summary || 'Your health report has been analyzed.'}
      </p>

      {/* Status Pills floating */}
      <div className="flex flex-wrap justify-center gap-2">
        {categoryStatuses.map((cs, i) => (
          <motion.span
            key={i}
            className={`zen-pill ${cs.status === 'normal' ? 'zen-pill-normal' : cs.status === 'mild' ? 'zen-pill-mild' : 'zen-pill-critical'}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.08, duration: 0.3 }}
          >
            {cs.status === 'normal' ? '✓' : cs.status === 'mild' ? '●' : '!'} {cs.label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
