import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Droplet,
  FileText,
  Syringe,
  Pill,
  Info,
  Calculator,
  ArrowDownCircle,
  XCircle,
  Stethoscope,
  Thermometer,
  ShieldAlert,
  User
} from 'lucide-react';
import { PatientGroup, Gender, Stage, PatientState, DecisionResult } from './types';
import {
  evaluateScreening,
  evaluateIronTherapy,
  evaluateWorkup,
  evaluateESA
} from './utils/decisionEngine';

// --- Reusable Components (Optimized for Design) ---

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Label = ({ children, icon }: { children?: React.ReactNode, icon?: React.ReactNode }) => (
  <label className="block text-base font-bold text-slate-700 mb-2 flex items-center gap-2">
    {icon && <span className="text-indigo-500">{icon}</span>}
    {children}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative group">
    <input
      {...props}
      className="w-full px-4 py-3.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 group-hover:border-indigo-200"
    />
  </div>
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative group">
    <select
      {...props}
      className="w-full px-4 py-3.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer group-hover:border-indigo-200"
    />
    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
      <ChevronRight className="w-5 h-5 text-indigo-400 rotate-90" />
    </div>
  </div>
);

const Checkbox = ({ label, checked, onChange, variant = 'default' }: { label: string, checked: boolean, onChange: (c: boolean) => void, variant?: 'default' | 'danger' | 'success' }) => {
  // Lively but professional color palette
  let activeClass = 'bg-indigo-50 border-indigo-500 shadow-sm shadow-indigo-100';
  let iconClass = 'bg-indigo-600 border-indigo-600';
  let textClass = 'text-indigo-900';

  if (variant === 'danger') {
    activeClass = 'bg-rose-50 border-rose-500 shadow-sm shadow-rose-100';
    iconClass = 'bg-rose-500 border-rose-500';
    textClass = 'text-rose-900';
  } else if (variant === 'success') {
    activeClass = 'bg-teal-50 border-teal-500 shadow-sm shadow-teal-100';
    iconClass = 'bg-teal-500 border-teal-500';
    textClass = 'text-teal-900';
  }

  return (
    <div
      className={`flex items-start md:items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 group
        ${checked ? activeClass : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-sm'}`}
      onClick={() => onChange(!checked)}
    >
      <div className={`mt-0.5 md:mt-0 w-6 h-6 rounded-md border flex items-center justify-center mr-4 shrink-0 transition-all duration-300 
        ${checked ? iconClass : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400'}`}>
        {checked && <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />}
      </div>
      <span className={`text-base font-medium leading-relaxed transition-colors ${checked ? textClass : 'text-slate-600 group-hover:text-slate-900'}`}>{label}</span>
    </div>
  );
};

const ResultBox = ({ result }: { result: DecisionResult | null }) => {
  if (!result) return null;

  const styles = {
    urgent: 'bg-rose-50 border-l-[6px] border-rose-500 text-rose-900',
    treatment: 'bg-teal-50 border-l-[6px] border-teal-500 text-teal-900',
    info: 'bg-sky-50 border-l-[6px] border-sky-500 text-sky-900',
  };

  const iconContainerStyles = {
    urgent: 'bg-rose-100 text-rose-600',
    treatment: 'bg-teal-100 text-teal-600',
    info: 'bg-sky-100 text-sky-600',
  };

  const type = result.recommendationType || 'info';

  return (
    <div className={`p-6 md:p-8 rounded-r-2xl shadow-sm flex flex-col md:flex-row gap-6 ${styles[type]} mt-10 animate-fade-in`}>
      <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center ${iconContainerStyles[type]} shadow-inner`}>
        {type === 'urgent' && <AlertTriangle className="w-7 h-7" strokeWidth={2.5} />}
        {type === 'treatment' && <CheckCircle className="w-7 h-7" strokeWidth={2.5} />}
        {type === 'info' && <Info className="w-7 h-7" strokeWidth={2.5} />}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-2xl mb-3 tracking-tight">{result.title}</h4>
        <p className="mb-5 text-lg leading-relaxed font-medium opacity-90">{result.message}</p>
        {result.details && result.details.length > 0 && (
          <ul className="space-y-3 text-base mt-4 bg-white/50 p-5 rounded-xl border border-black/5">
            {result.details.map((d, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-current opacity-60 shrink-0 block" />
                <span className="leading-relaxed font-medium">{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const initialPatientState: PatientState = {
  group: null,
  gender: null,
  hb: '',
  ferritin: '',
  tsat: '',
  serumIron: '',
  tibc: '',
  hasActiveInfection: false,
  workupAllNegative: false,
  workupSmear: false,
  workupHemolysis: false,
  workupInflammation: false,
  workupB12Folate: false,
  workupLiver: false,
  workupThyroid: false,
  workupParathyroid: false,
  workupMyeloma: false,
  workupParasites: false,
  currentStrokeOrThrombosis: false,
  isPregnant: false,
  activeMalignancy: false,
  historyOfCancer: false,
  polycysticKidneyDisease: false,
  proliferativeRetinalDisease: false,
  pulmonaryArterialHypertension: false,
  hepaticImpairment: false,
  priorCVEvents: false,
  priorThromboembolicEvents: false,
  esaIntolerance: false,
  esaHyporesponsive: false,
  highCRP: false,
  accessToRefrigeration: true,
  preference: null,
  // Add defaults for new fields if any
};

export default function App() {
  const [stage, setStage] = useState<Stage>(Stage.Screening);
  const [patient, setPatient] = useState<PatientState>(initialPatientState);
  const [recommendation, setRecommendation] = useState<DecisionResult | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const [esaStep, setEsaStep] = useState(1);
  const tier2Ref = useRef<HTMLDivElement>(null);
  const tier3Ref = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const stages = [
    { id: Stage.Screening, label: '基本資料' },
    { id: Stage.IronTherapy, label: '鐵指數' },
    { id: Stage.FullWorkup, label: '鑑別診斷' },
    { id: Stage.ESAManagement, label: '治療選擇' },
  ];

  const updatePatient = (field: keyof PatientState, value: any) => {
    // Validation: prevent negative values for numeric fields
    if (['hb', 'ferritin', 'tsat', 'serumIron', 'tibc'].includes(field)) {
      if (typeof value === 'number' && value < 0) return;
    }
    setPatient(prev => ({ ...prev, [field]: value }));
    setRecommendation(null);
  };

  const toggleWorkupItem = (field: keyof PatientState, value: boolean) => {
    setPatient(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'workupAllNegative' && value === true) {
        newState.workupSmear = false;
        newState.workupHemolysis = false;
        newState.workupInflammation = false;
        newState.workupB12Folate = false;
        newState.workupLiver = false;
        newState.workupThyroid = false;
        newState.workupParathyroid = false;
        newState.workupMyeloma = false;
        newState.workupParasites = false;
      }
      if (field !== 'workupAllNegative' && value === true) {
        newState.workupAllNegative = false;
      }
      return newState;
    });
    setRecommendation(null);

    // Auto-advance if "All Negative" is checked (Diagnosis confirmed)
    if (field === 'workupAllNegative' && value === true) {
      setTimeout(() => {
        setRecommendation(null);
        setStage(prev => prev + 1);
        // Scrolling handled by useEffect
      }, 600);
    }
  };

  const handleCalculatorUpdate = (field: 'serumIron' | 'tibc', value: any) => {
    const numValue = value === '' ? '' : parseFloat(value);

    // Validation: prevent negative values
    if (typeof numValue === 'number' && numValue < 0) return;

    const currentIron = field === 'serumIron' ? numValue : patient.serumIron;
    const currentTibc = field === 'tibc' ? numValue : patient.tibc;
    let newTsat = patient.tsat;

    if (currentIron !== '' && currentTibc !== '' && currentTibc !== 0) {
      newTsat = Math.round(((currentIron as number) / (currentTibc as number)) * 100);
    }

    setPatient(prev => ({
      ...prev,
      [field]: numValue,
      tsat: newTsat
    }));
    setRecommendation(null);
  };

  const handleNext = () => {
    setRecommendation(null);
    setStage(prev => prev + 1);
    // Scrolling handled by useEffect
  };

  const handleBack = () => {
    setRecommendation(null);
    setStage(prev => Math.max(1, prev - 1));
  };

  // Ensure scroll to top on stage change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage]);

  useEffect(() => {
    let result: DecisionResult | null = null;
    switch (stage) {
      case Stage.Screening:
        if (patient.hb !== '' && patient.gender) result = evaluateScreening(patient);
        break;
      case Stage.IronTherapy:
        if (patient.ferritin !== '' && patient.tsat !== '' && patient.group) result = evaluateIronTherapy(patient);
        break;
      case Stage.FullWorkup:
        result = evaluateWorkup(patient);
        break;
      case Stage.ESAManagement:
        if (patient.hb !== '') result = evaluateESA(patient);
        break;
    }
    setRecommendation(result);
  }, [patient, stage]);

  useEffect(() => {
    if (stage === Stage.ESAManagement) setEsaStep(1);
  }, [stage]);

  useEffect(() => {
    if (stage === Stage.ESAManagement) {
      if (esaStep === 2) setTimeout(() => tier2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      if (esaStep === 3) setTimeout(() => tier3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      if (esaStep === 4) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [esaStep, stage]);

  const canProceed = () => {
    if (recommendation?.status === 'stop') return false;
    if (stage === Stage.Screening && (!patient.hb || !patient.gender || !patient.group)) return false;
    if (stage === Stage.IronTherapy && (patient.tsat === '' || patient.ferritin === '')) return false;
    if (stage === Stage.FullWorkup) {
      const hasSelection = patient.workupAllNegative ||
        patient.workupSmear || patient.workupHemolysis || patient.workupInflammation ||
        patient.workupB12Folate || patient.workupLiver || patient.workupThyroid ||
        patient.workupParathyroid || patient.workupMyeloma || patient.workupParasites;
      if (!hasSelection) return false;
      return true;
    }
    if (stage === Stage.ESAManagement) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-100/50 text-slate-800 pb-20 font-sans text-base">
      {/* Header - Vibrant Gradient */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white p-5 md:p-8 shadow-xl relative overflow-hidden">
        {/* Decorative Background Circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-white/10 blur-2xl"></div>

        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold flex items-center gap-3 md:gap-4 tracking-tight drop-shadow-sm">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0 overflow-hidden p-1">
                {!logoError ? (
                  <img
                    src={`${import.meta.env.BASE_URL}cch_logo.png`}
                    alt="Changhua Christian Medical Foundation Logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="text-indigo-700 font-black text-xl">CCH</div>
                )}
              </div>
              <div className="flex flex-col">
                <span>貧血管理助手 (Anemia Assistant)</span>
                <span className="text-xs md:text-lg font-medium text-cyan-100 opacity-90 mt-0.5 md:mt-1">(基於 2026 KDIGO 指南)</span>
              </div>
            </h1>
            <p className="text-indigo-100 text-xs md:text-base mt-2 md:mt-3 font-medium opacity-90 ml-1">臨床決策支持系統 (CDSS)</p>
          </div>
          <div className="hidden md:block text-sm text-cyan-100 border border-white/20 bg-white/10 px-5 py-2.5 rounded-full font-semibold backdrop-blur-md shadow-sm">
            專業版 • v1.1
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto mt-10 px-4 md:px-6">

        {/* Progress Stepper - Optimized Visuals & Sticky Navigation */}
        <div className="sticky top-0 z-40 bg-slate-100/95 backdrop-blur-sm py-4 -mx-4 md:-mx-6 px-4 md:px-14 mb-10 shadow-sm border-b border-slate-200/50 transition-all">
          <div className="flex justify-between items-start relative max-w-4xl mx-auto">
            <div className="absolute top-7 left-0 w-full h-1.5 bg-slate-200 -z-0 rounded-full -mt-0.5"></div>
            {stages.map((s, idx) => {
              const isActive = stage === s.id;
              const isPast = stage > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStage(s.id)}
                  className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none w-20 md:w-32"
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl transition-all duration-300 shadow-md group-hover:scale-105 shrink-0
                    ${isActive ? 'bg-indigo-600 text-white shadow-indigo-200 scale-110 ring-4 ring-indigo-50 rotate-3' :
                      isPast ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100 group-hover:bg-indigo-100' : 'bg-white text-slate-300 border-2 border-slate-100 group-hover:border-indigo-200 group-hover:text-slate-400'}
                  `}>
                    {isPast ? <CheckCircle className="w-6 h-6 md:w-7 md:h-7" /> : s.id}
                  </div>
                  <span className={`text-[10px] md:text-sm mt-2 md:mt-3 font-bold uppercase tracking-wide text-center leading-tight transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Stage Content */}
        <Card className="p-4 md:p-12 animate-fade-in-up border-t-[8px] border-t-indigo-500">

          {/* STAGE 1: SCREENING */}
          {stage === Stage.Screening && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-sky-100 rounded-xl text-sky-600">
                    <Droplet className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-xl md:text-3xl font-bold text-slate-800">患者基本資料與實驗室數據</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">輸入初始參數以進行患者風險分層。</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <Label>患者分群 (CKD 階段)</Label>
                  <Select
                    value={patient.group || ''}
                    onChange={(e) => updatePatient('group', e.target.value as PatientGroup)}
                  >
                    <option value="" disabled>選擇分群...</option>
                    {Object.values(PatientGroup).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>生理性別</Label>
                  <Select
                    value={patient.gender || ''}
                    onChange={(e) => updatePatient('gender', e.target.value as Gender)}
                  >
                    <option value="" disabled>選擇性別...</option>
                    {Object.values(Gender).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Label icon={<Thermometer className="w-4 h-4" />}>血紅素濃度 (Hb) [g/dL]</Label>
                  <Input
                    type="number"
                    placeholder="例如 10.5"
                    value={patient.hb}
                    onChange={(e) => updatePatient('hb', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: IRON THERAPY */}
          {stage === Stage.IronTherapy && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                    <Syringe className="w-8 h-8" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800">鐵狀態評估</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">評估絕對與功能性缺鐵。</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <Label>血清鐵蛋白 [ng/ml]</Label>
                  <Input
                    type="number"
                    placeholder="例如 50"
                    value={patient.ferritin}
                    onChange={(e) => updatePatient('ferritin', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label>轉鐵蛋白飽和度 (TSAT) [%]</Label>
                  <Input
                    type="number"
                    placeholder="例如 20"
                    value={patient.tsat}
                    onChange={(e) => updatePatient('tsat', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>

                {/* TSAT Calculator Section */}
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="flex items-center text-base font-bold text-indigo-600 hover:text-indigo-800 transition-all mb-4 group bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg"
                  >
                    <Calculator className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                    {showCalculator ? '隱藏計算機' : '從血清鐵與 TIBC 計算 TSAT'}
                  </button>

                  {showCalculator && (
                    <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 gap-6 animate-fade-in shadow-inner">
                      <div className="col-span-2 text-slate-500 text-sm mb-1 flex items-center gap-2 font-medium">
                        <Info className="w-4 h-4 text-indigo-400" /> 公式：TSAT = (血清鐵 / TIBC) × 100
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">血清鐵 [µg/dL]</label>
                        <Input
                          type="number"
                          placeholder="例如 60"
                          value={patient.serumIron}
                          onChange={(e) => handleCalculatorUpdate('serumIron', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">總鐵結合力 (TIBC) [µg/dL]</label>
                        <Input
                          type="number"
                          placeholder="例如 300"
                          value={patient.tibc}
                          onChange={(e) => handleCalculatorUpdate('tibc', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-end md:col-span-2 mt-2">
                  <Checkbox
                    label="存在活動性全身感染？ (Presence of Active Systemic Infection)"
                    checked={patient.hasActiveInfection}
                    onChange={(val) => updatePatient('hasActiveInfection', val)}
                    variant="danger"
                  />
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-100 p-5 rounded-2xl text-base text-sky-800 flex items-center gap-3 shadow-sm">
                <div className="bg-sky-200 p-1.5 rounded-full shrink-0">
                  <Info className="w-5 h-5 text-sky-700" />
                </div>
                <span><span className="font-bold">患者資料摘要：</span> {patient.group} • Hb {patient.hb} g/dL</span>
              </div>
            </div>
          )}

          {/* STAGE 3: FULL WORKUP */}
          {stage === Stage.FullWorkup && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                    <Stethoscope className="w-8 h-8" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800">鑑別診斷</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">排除繼發性非腎性病因。</p>
              </div>

              <div className="space-y-6">
                {/* Success Case */}
                <Checkbox
                  variant="success"
                  label="排除繼發性原因（診斷：慢性腎病貧血）"
                  checked={patient.workupAllNegative}
                  onChange={(val) => toggleWorkupItem('workupAllNegative', val)}
                />

                {/* Separator */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-slate-400 uppercase tracking-widest font-extrabold">確認陽性發現</span>
                  </div>
                </div>

                {/* Positive Findings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Checkbox
                    label="周邊血液抹片異常"
                    checked={patient.workupSmear}
                    onChange={(val) => toggleWorkupItem('workupSmear', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="溶血（結合珠蛋白/LDH 異常）"
                    checked={patient.workupHemolysis}
                    onChange={(val) => toggleWorkupItem('workupHemolysis', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="CRP 升高（發炎）"
                    checked={patient.workupInflammation}
                    onChange={(val) => toggleWorkupItem('workupInflammation', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="維生素 B12 或葉酸缺乏"
                    checked={patient.workupB12Folate}
                    onChange={(val) => toggleWorkupItem('workupB12Folate', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="肝功能異常 (LFTs)"
                    checked={patient.workupLiver}
                    onChange={(val) => toggleWorkupItem('workupLiver', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="甲狀腺功能異常 (TSH)"
                    checked={patient.workupThyroid}
                    onChange={(val) => toggleWorkupItem('workupThyroid', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="甲狀旁腺功能亢進 (PTH 升高)"
                    checked={patient.workupParathyroid}
                    onChange={(val) => toggleWorkupItem('workupParathyroid', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="副蛋白血症（M 蛋白/輕鏈）"
                    checked={patient.workupMyeloma}
                    onChange={(val) => toggleWorkupItem('workupMyeloma', val)}
                    variant="danger"
                  />
                  <Checkbox
                    label="寄生蟲感染（如果懷疑）"
                    checked={patient.workupParasites}
                    onChange={(val) => toggleWorkupItem('workupParasites', val)}
                    variant="danger"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: ESA / HIF-PHI */}
          {stage === Stage.ESAManagement && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-teal-100 rounded-xl text-teal-600">
                    <Pill className="w-8 h-8" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800">藥物治療管理</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">ESA 與 HIF-PHI 選擇的循序評估。</p>
              </div>

              <div className="space-y-12">

                {/* Tier 1 */}
                <div className="bg-rose-50/50 p-6 md:p-8 rounded-2xl border border-rose-100 animate-fade-in shadow-sm">
                  <h3 className="text-2xl font-bold text-rose-800 mb-2 flex items-center gap-3">
                    <div className="bg-rose-200 p-1.5 rounded-lg"><ShieldAlert className="w-6 h-6 text-rose-700" /></div>
                    第 1 層：禁忌症與安全性
                  </h3>
                  <p className="text-sm text-rose-600/80 mb-6 font-bold uppercase tracking-wide ml-12">確認主要風險因素</p>

                  <div className="grid md:grid-cols-2 gap-4 ml-1">
                    <Checkbox
                      label="近期中風或活動性血栓"
                      checked={patient.currentStrokeOrThrombosis}
                      onChange={(val) => updatePatient('currentStrokeOrThrombosis', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="懷孕"
                      checked={patient.isPregnant}
                      onChange={(val) => updatePatient('isPregnant', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="有 ESA 不耐受紀錄"
                      checked={patient.esaIntolerance}
                      onChange={(val) => updatePatient('esaIntolerance', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="活動性惡性腫瘤"
                      checked={patient.activeMalignancy}
                      onChange={(val) => updatePatient('activeMalignancy', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="惡性腫瘤病史（緩解小於 5 年）"
                      checked={patient.historyOfCancer}
                      onChange={(val) => updatePatient('historyOfCancer', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="多囊腎 (ADPKD)"
                      checked={patient.polycysticKidneyDisease}
                      onChange={(val) => updatePatient('polycysticKidneyDisease', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="增殖性視網膜病變"
                      checked={patient.proliferativeRetinalDisease}
                      onChange={(val) => updatePatient('proliferativeRetinalDisease', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="肺動脈高壓 (PAH)"
                      checked={patient.pulmonaryArterialHypertension}
                      onChange={(val) => updatePatient('pulmonaryArterialHypertension', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="肝功能損害 (Child-Pugh B/C)"
                      checked={patient.hepaticImpairment}
                      onChange={(val) => updatePatient('hepaticImpairment', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="心血管事件病史（中風/心肌梗塞）"
                      checked={patient.priorCVEvents}
                      onChange={(val) => updatePatient('priorCVEvents', val)}
                      variant="danger"
                    />
                    <Checkbox
                      label="血栓栓塞病史 (DVT/PE)"
                      checked={patient.priorThromboembolicEvents}
                      onChange={(val) => updatePatient('priorThromboembolicEvents', val)}
                      variant="danger"
                    />
                  </div>

                  {esaStep === 1 && (
                    <div className="mt-8 flex justify-end">
                      <button
                        onClick={() => setEsaStep(2)}
                        className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-8 py-3.5 rounded-xl text-base font-bold hover:shadow-lg hover:shadow-rose-200 transition-all flex items-center gap-2 hover:-translate-y-1"
                      >
                        下一步：臨床狀況 <ArrowDownCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Tier 2 */}
                {esaStep >= 2 && (
                  <div ref={tier2Ref} className="bg-indigo-50/50 p-6 md:p-8 rounded-2xl border border-indigo-100 animate-fade-in shadow-sm">
                    <h3 className="text-2xl font-bold text-indigo-800 mb-2 flex items-center gap-3">
                      <div className="bg-indigo-200 p-1.5 rounded-lg"><Activity className="w-6 h-6 text-indigo-700" /></div>
                      第 2 層：臨床反應
                    </h3>
                    <p className="text-sm text-indigo-600/80 mb-6 font-bold uppercase tracking-wide ml-12">評估發炎狀態</p>
                    <div className="grid md:grid-cols-2 gap-4 ml-1">
                      <Checkbox
                        label="ESA 低反應性（EPO >300 (SC) 或 450 (IV) IU/kg/週）"
                        checked={patient.esaHyporesponsive}
                        onChange={(val) => updatePatient('esaHyporesponsive', val)}
                      />
                      <Checkbox
                        label="CRP 升高 (> 0.3 mg/dl)"
                        checked={patient.highCRP}
                        onChange={(val) => updatePatient('highCRP', val)}
                      />
                    </div>
                    {esaStep === 2 && (
                      <div className="mt-8 flex justify-end">
                        <button
                          onClick={() => setEsaStep(3)}
                          className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 hover:-translate-y-1"
                        >
                          下一步：偏好 <ArrowDownCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tier 3 */}
                {esaStep >= 3 && (
                  <div ref={tier3Ref} className="bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200 animate-fade-in shadow-sm">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                      <div className="bg-slate-200 p-1.5 rounded-lg"><User className="w-6 h-6 text-slate-700" /></div>
                      第 3 層：患者偏好與後勤
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 font-bold uppercase tracking-wide ml-12">給藥限制</p>
                    <div className="grid md:grid-cols-2 gap-4 ml-1">
                      <Checkbox
                        label="無法使用冷藏設備（冷鏈）"
                        checked={patient.accessToRefrigeration === false}
                        onChange={(val) => updatePatient('accessToRefrigeration', !val)}
                      />
                      <div className="flex flex-col gap-2">
                        <Label>偏好途徑：</Label>
                        <div className="flex gap-3">
                          <button
                            className={`flex-1 px-4 py-3 text-base font-bold rounded-xl border-2 transition-all ${patient.preference === 'Oral' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                            onClick={() => updatePatient('preference', 'Oral')}
                          >
                            口服 (Oral)
                          </button>
                          <button
                            className={`flex-1 px-4 py-3 text-base font-bold rounded-xl border-2 transition-all ${patient.preference === 'Injection' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                            onClick={() => updatePatient('preference', 'Injection')}
                          >
                            注射 (Injection)
                          </button>
                        </div>
                      </div>
                    </div>
                    {esaStep === 3 && (
                      <div className="mt-8 flex justify-end">
                        <button
                          onClick={() => setEsaStep(4)}
                          className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-10 py-4 rounded-xl text-lg font-bold hover:shadow-xl hover:shadow-teal-200 transition-all flex items-center gap-3 hover:-translate-y-1"
                        >
                          生成臨床建議 <CheckCircle className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RECOMMENDATION DISPLAY */}
          <div ref={resultRef}>
            {/* Regulatory Warning for ND-CKD + HIF-PHI */}
            {recommendation?.title.includes('建議：HIF-PHI') && patient.group && patient.group.includes('非透析') && ( // includes check for Chinese string
              <div className="space-y-4 mb-8 mt-6 animate-fade-in">
                {/* Compact Warning Box */}
                <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-base">法規警示 (台灣 FDA)</h4>
                    <p className="text-sm font-medium opacity-90">
                      HIF-PHI 目前在台灣尚未取得非透析 CKD 的健保給付規定或適應症（需再次確認最新仿單）。
                    </p>
                  </div>
                </div>

                {/* Shared Decision Making Context */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-slate-500" />
                    臨床策略：共同決策 (SDM)
                  </h4>
                  <p className="text-sm text-slate-600 mb-2 leading-relaxed">
                    此類患者面臨治療困境：<strong>ESA 不耐受</strong> (標準治療) 但 <strong>HIF-PHI 可能為仿單標示外使用</strong>。
                  </p>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside bg-white p-3 rounded-lg border border-slate-100">
                    <li>討論仿單標示外使用的風險/效益。</li>
                    <li>評估替代方案（例如：有症狀時給予紅血球輸血）。</li>
                    <li>諮詢腎臟科/血液科專家意見。</li>
                  </ul>
                </div>
              </div>
            )}

            {(stage !== Stage.ESAManagement || esaStep === 4) && <ResultBox result={recommendation} />}
          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={stage === 1}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-base transition-colors ${stage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-700'}`}
            >
              <ChevronLeft className="w-5 h-5" /> 返回
            </button>


            {/* Standard Next Button */}
            {recommendation?.status !== 'stop' && stage !== Stage.ESAManagement && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 md:px-10 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg w-full md:w-auto justify-center
                  ${!canProceed()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-indigo-200 hover:-translate-y-1'}
                `}
              >
                繼續 <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 mt-20 mb-12 text-center text-slate-500 text-sm font-medium">
        <p className="mb-2">© 2026 KDIGO 貧血管理工具。僅供教育使用。</p>
        <p className="mb-8 opacity-80">參考文獻：Kidney Int. 2026 Jan;109(1S):S1-S99</p>
      </footer>
    </div>
  );
}