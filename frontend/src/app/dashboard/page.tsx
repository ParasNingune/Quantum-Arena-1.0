'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, CheckCircle, Loader2, AlertTriangle, ChevronDown, Download, FileText, Clock } from 'lucide-react';
import HealthScoreGauge from '../../components/dashboard/HealthScoreGauge';
import HumanReadableTests from '../../components/dashboard/HumanReadableTests';
import TrendRibbon from '../../components/dashboard/TrendRibbon';
import AIInsightCards from '../../components/dashboard/AIInsightCards';
import DrNearby from '../../components/dashboard/DrNearby';
import SmartArticles from '../../components/dashboard/SmartArticles';
import DownloadPDF from '../../components/dashboard/DownloadPDF';
import PathToNormal from '../../components/dashboard/PathToNormal';
import UploadPanel from '../../components/dashboard/UploadPanel';
import ChatWidget from '../../components/dashboard/ChatWidget';
import PastReportsTab from '../../components/dashboard/PastReportsTab';
import CanvasSequence from "@/components/CanvasSequence";

/* ──────────────────────────────────────────── */
/* MOCK DATA (for demo mode)                    */
/* ──────────────────────────────────────────── */
const MOCK_DATA = {
  health_score: 62, health_grade: "Fair",
  health_summary: "Your report shows mild anemia patterns and borderline cholesterol. Most values are within normal range.",
  doctors_narrative: "Your hemoglobin is significantly below normal, indicating iron deficiency anemia. Combined with borderline fasting glucose (118 mg/dL) and elevated LDL cholesterol (148 mg/dL), there are early indicators of metabolic stress. The low Vitamin D (14 ng/mL) may contribute to fatigue and weakened immunity. These markers together suggest a need for dietary improvements and targeted supplementation.",
  tests: [
    { test_name: "Hemoglobin", value: 10.2, unit: "g/dL", status: "critical_low", severity: "critical", reference_range: "12.0 – 15.5 g/dL", category: "CBC", explanation: "Hemoglobin carries oxygen in your blood. Your level is significantly below normal, indicating anemia.", gauge_position: 0.25, deviation_pct: -22.0 },
    { test_name: "TSH", value: 2.1, unit: "uIU/mL", status: "normal", severity: "normal", reference_range: "0.5 – 4.5 uIU/mL", category: "Thyroid", explanation: "Your thyroid-stimulating hormone is normal.", gauge_position: 0.45, deviation_pct: 0 },
    { test_name: "LDL Cholesterol", value: 148, unit: "mg/dL", status: "high", severity: "mild", reference_range: "< 130 mg/dL", category: "Lipids", explanation: "LDL is slightly elevated. Diet and exercise can help.", gauge_position: 0.68, deviation_pct: 13.8 },
    { test_name: "Glucose (Fasting)", value: 118, unit: "mg/dL", status: "high", severity: "mild", reference_range: "70 – 100 mg/dL", category: "Metabolic", explanation: "Your fasting glucose is in the prediabetes range. Monitor diet.", gauge_position: 0.72, deviation_pct: 18.0 },
    { test_name: "Vitamin D", value: 14, unit: "ng/mL", status: "low", severity: "moderate", reference_range: "30 – 100 ng/mL", category: "Vitamins", explanation: "Vitamin D is significantly low. Consider supplementation.", gauge_position: 0.15, deviation_pct: -53.3 },
    { test_name: "Platelets", value: 210, unit: "×10³/μL", status: "normal", severity: "normal", reference_range: "150 – 400 ×10³/μL", category: "CBC", explanation: "Platelet count is normal.", gauge_position: 0.38, deviation_pct: 0 },
    { test_name: "Total Cholesterol", value: 195, unit: "mg/dL", status: "normal", severity: "normal", reference_range: "< 200 mg/dL", category: "Lipids", explanation: "Total cholesterol is within acceptable range.", gauge_position: 0.55, deviation_pct: 0 }
  ],
  patterns: [
    { name: "Iron Deficiency Anemia", confidence: 0.82, severity: "moderate", urgency: "moderate", explanation: "Your hemoglobin and related markers suggest iron deficiency anemia. This can cause fatigue, weakness, and pale skin.", symptoms: ["Fatigue", "Pale skin", "Shortness of breath"], doctor_questions: ["Should I start iron supplements?", "Do I need further testing?"], matched_tests: ["Hemoglobin"], icd10: "D50.9", dietary_note: "Include iron-rich foods like spinach, lentils, and fortified cereals." }
  ],
  doctor_questions: ["Should I start iron supplements?", "Is my prediabetes risk significant?", "Do I need a Vitamin D supplement?"],
  path_to_normal: {
    dietary_swaps: ["Replace red meat with plant-based proteins", "Add leafy greens for iron and folate", "Choose whole grains over refined carbs"],
    activity_prescription: "30 minutes of moderate walking daily, plus 2 strength training sessions per week."
  },
  curated_resources: {
    youtube: [{ title: "Mayo Clinic: Understanding Iron Deficiency Anemia", url: "https://www.youtube.com/results?search_query=iron+deficiency+anemia+explained" }],
    articles: [
      { title: "Managing Iron Through Diet — Harvard Health", url: "https://www.health.harvard.edu/staying-healthy/iron-and-your-health" },
      { title: "Sunlight & Supplements: A Vitamin D Guide", url: "https://www.healthline.com/nutrition/vitamin-d-101" }
    ]
  },
  recommended_specialists: [
    { specialty: "Hematologist", emoji: "🩸", reason: "To evaluate low hemoglobin and potential iron deficiency anemia.", maps_query: "Hematologist near me" },
    { specialty: "Endocrinologist", emoji: "🧬", reason: "To assess borderline glucose levels and metabolic health.", maps_query: "Endocrinologist near me" },
    { specialty: "Dietitian", emoji: "🥗", reason: "For a personalized meal plan addressing iron, Vitamin D, and cholesterol.", maps_query: "Dietitian nutritionist near me" }
  ]
};

/* ──────────────────────────────────────────── */
/* LOADING SEQUENCE                             */
/* ──────────────────────────────────────────── */
const LoadingSequence = () => {
  const [step, setStep] = useState(0);
  const steps = [
    "Extracting text from report...",
    "Identifying medical parameters...",
    "Checking reference ranges...",
    "Detecting clinical patterns...",
    "Generating your health summary..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s < 4 ? s + 1 : s));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-xl flex flex-col justify-center items-center mx-auto mt-16 bg-white/5 border border-white/10 rounded-2xl p-12">
      <div className="space-y-6 w-full max-w-sm mx-auto">
        {steps.map((text, i) => {
          const isActive = i === step;
          const isCompleted = i < step;
          return (
            <div key={i} className={`flex items-center space-x-4 transition-opacity duration-300 ${!isActive && !isCompleted ? 'opacity-40' : 'opacity-100'}`}>
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle className="text-emerald-500 w-6 h-6" />
                ) : isActive ? (
                  <Loader2 className="animate-spin text-white w-6 h-6" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                )}
              </div>
              <span className={`font-medium ${isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/50'}`}>
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────── */
/* SECTION NAV                                  */
/* ──────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Action Plan' },
  { id: 'resources', label: 'Resources' },
  { id: 'history', label: 'Past Reports' },
];

/* ──────────────────────────────────────────── */
/* RESULTS VIEW — Zen Medical Bento Grid        */
/* ──────────────────────────────────────────── */
function ResultsView({ results, onReset, user, onLogout, onViewReport }: { results: any; onReset: () => void; user: { name: string; email: string }; onLogout: () => void; onViewReport?: (r: any) => void }) {
  const allTests = results.all_tests || results.tests || [];
  const doctorQuestions = results.doctor_questions || [];
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const displayedQuestions = showAllQuestions ? doctorQuestions : doctorQuestions.slice(0, 3);

  return (
    <div className="zen-results relative">
      <ChatWidget analysisData={results} />
      {/* Light Navbar */}
      <nav
        className="w-full px-6 py-4 flex justify-between items-center sticky top-0 z-50"
        style={{
          background: 'rgba(248, 249, 250, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--zen-border)',
        }}
      >
        <Link href="/" className="font-bold text-xl tracking-tight transition-colors" style={{ color: 'var(--zen-text)' }}>
          MediSense AI
        </Link>
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium" style={{ color: 'var(--zen-text)' }}>{user.name}</span>
            <span className="text-xs" style={{ color: 'var(--zen-text-faint)' }}>{user.email}</span>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            style={{
              background: 'var(--zen-brand)',
              color: 'var(--zen-brand-text)',
              border: '1px solid var(--zen-border)',
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button onClick={onLogout} className="zen-btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
            Log Out
          </button>
        </div>
      </nav>

      {/* Tab Nav */}
      <div className="zen-section-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === id 
                ? 'text-[var(--zen-brand-text)] border-[var(--zen-brand-solid)]' 
                : 'text-[var(--zen-text-muted)] border-transparent hover:text-[var(--zen-text)] hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(id)}
            >
              {id === 'history' && <Clock className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 min-h-[70vh]">
        
        <AnimatePresence mode="wait">
          {/* ─── TAB: Overview ─── */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <section className="mb-12">
                <HealthScoreGauge data={{ ...results, all_tests: allTests }} />
              </section>

              <section className="mb-12">
                <div className="mb-8">
                  <TrendRibbon tests={allTests} />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--zen-text)' }}>Your Biomarkers</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--zen-text-faint)' }}>
                    Tap any card to see a plain-English explanation
                  </p>
                  <HumanReadableTests tests={allTests} />
                </div>
              </section>
            </motion.div>
          )}

          {/* ─── TAB: Action Plan ─── */}
          {activeTab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <section className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <AIInsightCards data={results} />
                  </div>
                  <div>
                    <PathToNormal pathData={results.path_to_normal} />
                  </div>
                </div>
              </section>

              {doctorQuestions.length > 0 && (
                <section className="mb-12">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: 'var(--zen-text)' }}>Questions for Your Doctor</h3>
                      <p className="text-xs" style={{ color: 'var(--zen-text-faint)' }}>Bring these to your next appointment</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {displayedQuestions.map((q: string, i: number) => (
                      <div key={i} className="zen-glass-solid p-4 flex gap-3 items-start cursor-pointer group" style={{ borderRadius: '14px' }} onClick={() => navigator.clipboard.writeText(q)}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--zen-brand)', color: 'var(--zen-brand-text)' }}>{i + 1}</span>
                        <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--zen-text-secondary)' }}>{q}</p>
                        <Copy className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--zen-text-faint)' }} />
                      </div>
                    ))}
                  </div>
                  {doctorQuestions.length > 3 && (
                    <button onClick={() => setShowAllQuestions(!showAllQuestions)} className="zen-btn-ghost mt-3 mx-auto" style={{ display: 'flex', fontSize: '0.75rem' }}>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllQuestions ? 'rotate-180' : ''}`} />
                      {showAllQuestions ? 'Show less' : `Show all ${doctorQuestions.length} questions`}
                    </button>
                  )}
                </section>
              )}
            </motion.div>
          )}

          {/* ─── TAB: Resources ─── */}
          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <section className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <DrNearby specialists={results.recommended_specialists} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="zen-glass-solid p-6" style={{ borderRadius: '20px' }}>
                      <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--zen-text)' }}>Export Your Report</h3>
                      <p className="text-xs mb-4" style={{ color: 'var(--zen-text-faint)' }}>Download a comprehensive PDF with all findings</p>
                      <DownloadPDF analysisData={results} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <SmartArticles resources={results.curated_resources} />
              </section>
            </motion.div>
          )}

          {/* ─── TAB: Past Reports ─── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <PastReportsTab
                userEmail={user.email}
                onViewReport={(report) => {
                  if (onViewReport) onViewReport(report);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze Another */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="text-center pt-4"
        >
          <button onClick={onReset} className="zen-btn-ghost" style={{ padding: '12px 32px' }}>
            ← Analyze Another Report
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* MAIN DASHBOARD                               */
/* ──────────────────────────────────────────── */
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string, email: string } | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [viewState, setViewState] = useState<'upload' | 'loading' | 'results'>('upload');
  const [results, setResults] = useState<any>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('medreport_user');
    if (!saved) {
      router.push('/auth');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.name || !parsed.email) throw new Error('Invalid user');
      setUser(parsed);
    } catch (e) {
      localStorage.removeItem('medreport_user');
      router.push('/auth');
    }

    fetch('http://127.0.0.1:8000/')
      .then(res => {
        setIsBackendOnline(res.ok);
      })
      .catch(() => setIsBackendOnline(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('medreport_user');
    router.push('/auth');
  };

  const handleAnalyze = async (file: File | null, age: string, gender: string, language: string, isDemo: boolean) => {
    setErrorBanner(null);
    setViewState('loading');

    if (isDemo || !isBackendOnline) {
      setTimeout(() => {
        setResults({ ...MOCK_DATA });
        setViewState('results');
      }, 10000);
    } else {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('age', age);
      formData.append('gender', gender);
      formData.append('language', language);

      if (user?.email) formData.append('user_email', user.email);

      try {
        const res = await fetch('http://127.0.0.1:8000/analyze', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(errBody || 'Analysis failed');
        }
        const data = await res.json();

        data.all_tests = data.tests || [];
        data.doctor_questions = data.doctor_questions || [];
        if (data.doctor_questions.length === 0) {
          (data.patterns || []).forEach((p: any) => {
            if (p.doctor_questions) data.doctor_questions.push(...p.doctor_questions);
          });
          data.doctor_questions = Array.from(new Set(data.doctor_questions));
        }

        setTimeout(() => {
          setResults(data);
          setViewState('results');
        }, 100);
      } catch (err: any) {
        console.error('Analysis error:', err);
        setErrorBanner(err.message || 'Failed to analyze the report with backend.');
        setViewState('upload');
      }
    }
  };

  const handleReset = () => {
    setResults(null);
    setViewState('upload');
  };

  if (!user) return <div className="min-h-screen bg-black" />;

  /* ── Results View: Zen Medical Light Theme ── */
  if (viewState === 'results' && results) {
    return (
      <ResultsView
        results={results}
        onReset={handleReset}
        user={user}
        onLogout={handleLogout}
        onViewReport={(report: any) => {
          setResults(report);
        }}
      />
    );
  }

  /* ── Upload / Loading: Dark layout preserved ── */
  return (
    <div className="min-h-screen bg-[#050B18] text-white pb-20">
      <CanvasSequence className="pointer-events-none" />

      <div className="relative z-10">
        {/* NAVBAR (preserved dark) */}
        <nav className="w-full border-b border-white/10 px-6 py-4 flex justify-between items-center bg-[#050B18]/80 backdrop-blur-md sticky top-0 z-50">
          <Link href="/" className="font-bold text-xl tracking-tight text-white/90 hover:text-white transition-colors">
            MedReport AI
          </Link>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-white/50">{user.email}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm border border-white/20 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors ml-4"
            >
              Log Out
            </button>
          </div>
        </nav>

        {/* BACKEND STATUS BANNER */}
        {!isBackendOnline && (
          <div className="w-full bg-amber-500/20 px-6 py-3 border-b border-amber-500/30 flex justify-center items-center text-amber-200">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">⚠️ Backend offline — Demo Mode active</span>
          </div>
        )}

        {/* ERROR BANNER */}
        {errorBanner && viewState === 'upload' && (
          <div className="max-w-xl mx-auto mt-8 flex justify-between items-center bg-red-500/10 border border-red-500/30 px-6 py-4 rounded-xl text-red-300">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3" />
              <span className="text-sm">{errorBanner}</span>
            </div>
            <button
              onClick={() => handleAnalyze(null, '30', 'Male', 'English', true)}
              className="ml-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Switch to Demo Mode
            </button>
          </div>
        )}

        <main className="px-6 relative">
          <AnimatePresence mode="wait">
            {viewState === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <UploadPanel onAnalyze={handleAnalyze} />
              </motion.div>
            )}

            {viewState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <LoadingSequence />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
