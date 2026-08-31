import { useState, useEffect } from 'react';
import { Sparkles, Play, RotateCcw, CheckCircle2 } from 'lucide-react';
import DetectionMap from './DetectionMap';
import OptimizationProgress from './OptimizationProgress';
import OptimalRouteSummary from './OptimalRouteSummary';
import { candidateRoutes, sampleDebrisLocations } from '../../data/routeMockData';

export default function EcoRouteOptimizer({ surveyName = 'Arabian Sea Survey 2026' }) {
  const [step, setStep] = useState('optimizing');
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(25);

  const startOptimization = () => {
    setStep('optimizing');
    setProgressPct(25);
    setActiveRouteIndex(0);
  };

  useEffect(() => {
    if (step !== 'optimizing') return;
    let currentRouteIdx = 0;
    const interval = setInterval(() => {
      currentRouteIdx += 1;
      if (currentRouteIdx < candidateRoutes.length) {
        setActiveRouteIndex(currentRouteIdx);
        setProgressPct(Math.round(((currentRouteIdx + 1) / candidateRoutes.length) * 100));
      } else {
        clearInterval(interval);
        const optimalIdx = candidateRoutes.findIndex((r) => r.isOptimal);
        setActiveRouteIndex(optimalIdx !== -1 ? optimalIdx : 3);
        setProgressPct(100);
        setStep('complete');
      }
    }, 700);
    return () => clearInterval(interval);
  }, [step]);

  const activeRoute = candidateRoutes[activeRouteIndex] || candidateRoutes[3];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 size={14} /> {surveyName} · {sampleDebrisLocations.length} debris locations identified
        </div>
        {step === 'complete' && (
          <button onClick={startOptimization} className="btn-secondary flex items-center gap-2 text-xs">
            <RotateCcw size={14} /> Re-Optimize Route
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DetectionMap
            activeCandidateRoute={activeRoute}
            isOptimizing={step === 'optimizing'}
            isComplete={step === 'complete'}
          />
        </div>
        <div className="lg:col-span-5">
          {step === 'analyzed' ? (
            <div className="glass-panel flex min-h-[520px] flex-col items-center justify-center space-y-4 p-8 text-center">
              <Sparkles className="text-cyan-300" size={32} />
              <h3 className="text-xl font-bold">Ready for Route Optimization</h3>
              <p className="max-w-sm text-sm text-slate-400">
                7 marine debris targets have been detected. Simulate candidate routes to find the most eco-efficient cleanup path.
              </p>
              <button onClick={startOptimization} className="btn-primary flex items-center gap-2 px-8 py-3">
                <Play size={18} /> Optimize Cleanup Route
              </button>
            </div>
          ) : (
            <OptimizationProgress
              activeRouteIndex={activeRouteIndex}
              isOptimizing={step === 'optimizing'}
              progressPct={progressPct}
              onSelectRoute={(idx) => setActiveRouteIndex(idx)}
            />
          )}
        </div>
      </div>

      {step === 'complete' && (
        <OptimalRouteSummary selectedRoute={activeRoute} onReset={startOptimization} />
      )}
    </div>
  );
}
