import { useState, useEffect } from 'react';
import UploadBox from '../components/surveys/UploadBox';
import EcoRouteOptimizer from '../components/route/EcoRouteOptimizer';
import { Loader2, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

export default function NewSurvey() {
  const [formData, setFormData] = useState({
    name: 'Arabian Sea Survey 2026',
    location: 'Arabian Sea (Sector 4)',
    date: '2026-08-30',
  });

  // Flow mode: 'form' | 'processing' | 'optimizer'
  const [viewMode, setViewMode] = useState('form');
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartAnalysis = () => {
    setViewMode('processing');
    setProcessingProgress(0);
  };

  useEffect(() => {
    if (viewMode !== 'processing') return;

    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setViewMode('optimizer'), 400);
          return 100;
        }
        return prev + 25;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [viewMode]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="mb-1 text-3xl font-bold">
            New Marine Survey & Route Optimization
          </h1>
          <p className="text-slate-400">
            {viewMode === 'form' && 'Create and upload sonar survey data for AI detection and eco-route planning'}
            {viewMode === 'processing' && 'AI Model analyzing sonar scan and extracting coordinate metadata...'}
            {viewMode === 'optimizer' && 'Eco-Optimized Cleanup Route trajectory analysis'}
          </p>
        </div>

        {viewMode === 'optimizer' && (
          <button
            onClick={() => setViewMode('form')}
            className="btn-secondary text-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <ArrowLeft size={16} /> New Upload
          </button>
        )}
      </div>

      {/* VIEW 1: FORM & UPLOAD */}
      {viewMode === 'form' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Survey Information Form */}
            <div className="glass-panel rounded-xl p-6">
              <h2 className="mb-6 text-xl font-semibold">
                Survey Information
              </h2>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Survey Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Arabian Sea Survey 2026"
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Survey Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Arabian Sea"
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Survey Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </form>
            </div>

            {/* File Upload */}
            <div>
              <h2 className="mb-6 text-xl font-semibold">
                Upload Sonar Data
              </h2>
              <UploadBox />
            </div>
          </div>

          {/* Start Analysis Button */}
          <div className="flex justify-end">
            <button
              onClick={handleStartAnalysis}
              className="btn-primary px-8 py-3 bg-gradient-to-r from-ocean-blue to-cyan hover:opacity-90 shadow-lg text-base"
            >
              Start Analysis & Route Optimization
            </button>
          </div>
        </>
      )}

      {/* VIEW 2: AI PROCESSING ANIMATION */}
      {viewMode === 'processing' && (
        <div className="glass-panel mx-auto max-w-xl space-y-6 rounded-xl p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
            <Loader2 className="animate-spin" size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              Analyzing Sonar Data...
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Running deep neural network object detection on uploaded sonar imagery.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>AI Detection Progress</span>
              <span>{processingProgress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="bg-gradient-to-r from-ocean-blue to-cyan h-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>

          {/* Pipeline Step Checkmarks */}
          <div className="space-y-2 border-t border-cyan-400/10 pt-4 text-left text-xs">
            <div className={`flex items-center gap-2 ${processingProgress >= 25 ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 size={16} /> Sonar file validation & decompression completed
            </div>
            <div className={`flex items-center gap-2 ${processingProgress >= 50 ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 size={16} /> Noise reduction & bathymetric matrix extracted
            </div>
            <div className={`flex items-center gap-2 ${processingProgress >= 75 ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
              <CheckCircle2 size={16} /> Debris object classification & confidence scoring
            </div>
            <div className={`flex items-center gap-2 ${processingProgress >= 100 ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}>
              <Sparkles size={16} /> Georeferenced coordinate mapping complete
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ECO ROUTE OPTIMIZER */}
      {viewMode === 'optimizer' && (
        <EcoRouteOptimizer
          surveyName={formData.name}
          surveyId="SUR-024"
        />
      )}
    </div>
  );
}

