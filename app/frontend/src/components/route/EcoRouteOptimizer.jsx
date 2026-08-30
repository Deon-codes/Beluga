import { useState, useEffect } from 'react';
import { Sparkles, Play, RotateCcw, Sliders, CheckCircle2, Zap } from 'lucide-react';
import DetectionMap from './DetectionMap';
import OptimizationProgress from './OptimizationProgress';
import OptimalRouteSummary from './OptimalRouteSummary';
import { candidateRoutes, sampleDebrisLocations } from '../../data/routeMockData';

export default function EcoRouteOptimizer({ surveyId = 'SUR-024', surveyName = 'Arabian Sea Survey 2026' }) {
  // Simulation States: 'idle' | 'analyzed' | 'optimizing' | 'complete'
  const [step, setStep] = useState('analyzed');
  const [objective, setObjective] = useState('priority_distance');
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  // Trigger route optimization sequence
  const startOptimization = () => {
    setStep('optimizing');
    setProgressPct(0);
    setActiveRouteIndex(0);
  };

  // Run visual optimization sequence when 'optimizing' state is active
  useEffect(() => {
    if (step !== 'optimizing') return;

    let currentRouteIdx = 0;
    const totalCandidates = candidateRoutes.length;

    const interval = setInterval(() => {
      currentRouteIdx += 1;

      if (currentRouteIdx < totalCandidates) {
        setActiveRouteIndex(currentRouteIdx);
        setProgressPct(Math.round(((currentRouteIdx + 1) / totalCandidates) * 100));
      } else {
        clearInterval(interval);
        // Find optimal index (Route D = index 3)
        const optimalIdx = candidateRoutes.findIndex((r) => r.isOptimal);
        setActiveRouteIndex(optimalIdx !== -1 ? optimalIdx : 3);
        setProgressPct(100);
        setStep('complete');
      }
    }, 900); // 900ms per candidate route transition

    return () => clearInterval(interval);
  }, [step]);

  const activeRoute = candidateRoutes[activeRouteIndex] || candidateRoutes[3];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-ocean-blue/30 text-white border-none shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Zap size={14} /> AI Post-Processing Pipeline
            </div>
            <h2 className="text-2xl font-black mt-1 text-white">
              Eco-Optimized Cleanup Route Planning
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Generates energy-efficient marine debris collection trajectories balancing distance, estimated fuel emissions, and location priority.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {step === 'analyzed' && (
              <button
                onClick={startOptimization}
                className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-ocean-blue to-cyan hover:opacity-90 text-white shadow-lg shadow-cyan/25 transition-all flex items-center gap-2"
              >
                <Play size={18} /> Optimize Cleanup Route
              </button>
            )}
            {step === 'complete' && (
              <button
                onClick={startOptimization}
                className="px-4 py-2.5 rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-2 border border-white/20 text-sm"
              >
                <RotateCcw size={16} /> Re-Optimize Route
              </button>
            )}
          </div>
        </div>

        {/* Survey Analysis Status Bar */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 size={16} /> Sonar Image Upload Completed
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 size={16} /> AI Object Classification Finished
          </div>
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Sparkles size={16} /> {sampleDebrisLocations.length} Debris Locations Identified
          </div>
        </div>
      </div>

      {/* Controls & Objective Selector */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-light-text dark:text-dark-text">
          <Sliders size={18} className="text-ocean-blue dark:text-cyan" />
          <span>Optimization Objective:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setObjective('priority_distance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              objective === 'priority_distance'
                ? 'bg-ocean-blue text-white dark:bg-cyan dark:text-slate-950 font-bold shadow-md'
                : 'bg-light-surface dark:bg-dark-surface text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            ● Priority + Distance (Default)
          </button>
          <button
            onClick={() => setObjective('min_distance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              objective === 'min_distance'
                ? 'bg-ocean-blue text-white dark:bg-cyan dark:text-slate-950 font-bold shadow-md'
                : 'bg-light-surface dark:bg-dark-surface text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            ○ Minimum Distance
          </button>
          <button
            onClick={() => setObjective('min_co2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              objective === 'min_co2'
                ? 'bg-ocean-blue text-white dark:bg-cyan dark:text-slate-950 font-bold shadow-md'
                : 'bg-light-surface dark:bg-dark-surface text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            ○ Minimum CO₂
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Leaflet Map + Simulation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map (7 cols) */}
        <div className="lg:col-span-7">
          <DetectionMap
            activeCandidateRoute={step === 'analyzed' ? null : activeRoute}
            isOptimizing={step === 'optimizing'}
            isComplete={step === 'complete'}
          />
        </div>

        {/* Right Column: Optimization Progress or Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {step === 'analyzed' && (
            <div className="card p-8 text-center space-y-4 flex flex-col items-center justify-center min-h-[520px]">
              <div className="w-16 h-16 rounded-full bg-ocean-blue/10 dark:bg-cyan/10 flex items-center justify-center text-ocean-blue dark:text-cyan mb-2">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold text-light-text dark:text-dark-text">
                Ready for Route Optimization
              </h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-sm">
                7 marine debris targets have been detected and mapped. Click below to simulate candidate routes and determine the most eco-efficient cleanup path.
              </p>
              <button
                onClick={startOptimization}
                className="btn-primary px-8 py-3 text-base flex items-center gap-2 bg-gradient-to-r from-ocean-blue to-cyan hover:opacity-90 shadow-lg"
              >
                <Play size={18} /> Optimize Cleanup Route
              </button>
            </div>
          )}

          {(step === 'optimizing' || step === 'complete') && (
            <OptimizationProgress
              activeRouteIndex={activeRouteIndex}
              isOptimizing={step === 'optimizing'}
              progressPct={progressPct}
              onSelectRoute={(idx) => setActiveRouteIndex(idx)}
            />
          )}
        </div>
      </div>

      {/* Complete Route Summary Panel */}
      {step === 'complete' && (
        <OptimalRouteSummary
          selectedRoute={activeRoute}
          onReset={startOptimization}
        />
      )}
    </div>
  );
}
