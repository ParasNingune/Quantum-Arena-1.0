'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* Maps technical test names → human-readable labels */
const HUMAN_NAMES: Record<string, string> = {
  'hemoglobin': 'Energy Levels', 'rbc': 'Red Blood Cell Count', 'wbc': 'Immune Defense',
  'platelets': 'Clotting Ability', 'hematocrit': 'Blood Thickness', 'mcv': 'Red Cell Size',
  'mch': 'Oxygen per Cell', 'mchc': 'Oxygen Density', 'rdw': 'Cell Size Variation',
  'neutrophils': 'Bacterial Defense', 'lymphocytes': 'Viral Defense', 'monocytes': 'Tissue Repair',
  'eosinophils': 'Allergy Response', 'basophils': 'Inflammation Markers',
  'esr': 'Inflammation Speed', 'crp': 'Inflammation Level',
  'glucose': 'Blood Sugar', 'fasting glucose': 'Fasting Blood Sugar',
  'hba1c': 'Long-term Sugar', 'insulin': 'Sugar Hormone',
  'total cholesterol': 'Total Cholesterol', 'ldl cholesterol': 'Bad Cholesterol', 'ldl': 'Bad Cholesterol',
  'hdl cholesterol': 'Good Cholesterol', 'hdl': 'Good Cholesterol',
  'triglycerides': 'Blood Fats', 'vldl': 'Very Bad Cholesterol',
  'tsh': 'Thyroid Control', 't3': 'Active Thyroid', 't4': 'Thyroid Storage',
  'free t3': 'Active Thyroid', 'free t4': 'Thyroid Storage',
  'creatinine': 'Kidney Filter', 'bun': 'Kidney Waste', 'blood urea nitrogen': 'Kidney Waste',
  'urea': 'Kidney Waste', 'egfr': 'Kidney Speed', 'uric acid': 'Joint Health',
  'sgpt': 'Liver (ALT)', 'sgot': 'Liver (AST)', 'alt': 'Liver (ALT)', 'ast': 'Liver (AST)',
  'alp': 'Bone & Liver', 'alkaline phosphatase': 'Bone & Liver',
  'bilirubin': 'Liver Pigment', 'total bilirubin': 'Liver Pigment',
  'direct bilirubin': 'Liver Processing', 'albumin': 'Blood Protein',
  'total protein': 'Body Protein', 'globulin': 'Immune Protein',
  'vitamin d': 'Sunshine Vitamin', 'vitamin b12': 'Nerve Vitamin',
  'iron': 'Iron Stores', 'ferritin': 'Iron Reserve', 'tibc': 'Iron Transport',
  'transferrin': 'Iron Carrier', 'calcium': 'Bone Mineral', 'phosphorus': 'Bone Partner',
  'magnesium': 'Muscle Mineral', 'sodium': 'Salt Balance',
  'potassium': 'Heart Mineral', 'chloride': 'Fluid Balance',
};

/* Category → icon SVG */
const CATEGORY_ICONS: Record<string, string> = {
  'CBC': '🩸', 'Lipids': '❤️', 'Metabolic': '⚡', 'Thyroid': '🦋',
  'Kidney': '🫘', 'Liver': '🫁', 'Vitamins': '☀️', 'Minerals': '💎',
  'Immune': '🛡️', 'General': '🔬',
};

function getHumanName(testName: string): string {
  const key = testName.toLowerCase().trim();
  if (HUMAN_NAMES[key]) return HUMAN_NAMES[key];
  for (const [k, v] of Object.entries(HUMAN_NAMES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return testName;
}

function getStatusStyle(status: string, severity: string) {
  if (status === 'normal') return { pill: 'zen-pill-normal', fill: 'var(--zen-normal-accent)', icon: '✓' };
  if (severity === 'mild') return { pill: 'zen-pill-mild', fill: 'var(--zen-mild-accent)', icon: '●' };
  return { pill: 'zen-pill-critical', fill: 'var(--zen-critical-accent)', icon: '!' };
}

export default function HumanReadableTests({ tests }: { tests: any[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!tests || tests.length === 0) {
    return (
      <div className="zen-glass-solid p-6">
        <p style={{ color: 'var(--zen-text-muted)', fontSize: '0.875rem' }}>
          No test results to display.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tests.map((test, i) => {
        const humanName = getHumanName(test.test_name);
        const isExpanded = expandedIdx === i;
        const isHovered = hoveredIdx === i;
        const style = getStatusStyle(test.status, test.severity);
        const gaugePos = test.gauge_position != null ? test.gauge_position : 0.5;
        const catIcon = CATEGORY_ICONS[test.category] || CATEGORY_ICONS['General'];

        return (
          <motion.div
            key={i}
            className="zen-glass-solid group relative cursor-pointer overflow-hidden"
            style={{ borderRadius: '20px' }}
            onClick={() => setExpandedIdx(isExpanded ? null : i)}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Tooltip */}
            {isHovered && !isExpanded && (
              <div className="zen-tooltip">Why this matters →</div>
            )}

            <div className="p-5">
              {/* Top: Icon + Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                  style={{ background: test.status === 'normal' ? 'var(--zen-normal-bg)' : test.severity === 'mild' ? 'var(--zen-mild-bg)' : 'var(--zen-critical-bg)' }}
                >
                  {catIcon}
                </div>
                <span className={`zen-pill ${style.pill}`} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>
                  {style.icon} {test.status.replace('_', ' ')}
                </span>
              </div>

              {/* Name */}
              <h4 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--zen-text)' }}>{humanName}</h4>
              <p className="text-xs mb-3" style={{ color: 'var(--zen-text-faint)' }}>{test.test_name}</p>

              {/* Value */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold" style={{ color: 'var(--zen-text)' }}>{test.value}</span>
                <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>{test.unit}</span>
              </div>

              {/* Progress bar */}
              <div className="zen-progress-track">
                <motion.div
                  className="zen-progress-fill"
                  style={{ background: style.fill }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, Math.max(5, gaugePos * 100))}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.04 }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--zen-text-faint)' }}>
                Ref: {test.reference_range || '—'}
              </p>
            </div>

            {/* Expanded explanation */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid var(--zen-border)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--zen-text-secondary)' }}>
                      {test.explanation || 'No additional explanation available.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
