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
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-1">
            New Marine Survey & Route Optimization
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
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
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
                Survey Information
              </h2>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
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
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
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
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
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
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
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
        <div className="card p-12 text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-ocean-blue/10 dark:bg-cyan/10 flex items-center justify-center text-ocean-blue dark:text-cyan">
            <Loader2 className="animate-spin" size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
              Analyzing Sonar Data...
            </h2>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
              Running deep neural network object detection on uploaded sonar imagery.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-light-text dark:text-dark-text">
              <span>AI Detection Progress</span>
              <span>{processingProgress}%</span>
            </div>
            <div className="w-full bg-light-border dark:bg-dark-border h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-ocean-blue to-cyan h-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>

          {/* Pipeline Step Checkmarks */}
          <div className="text-left text-xs space-y-2 pt-4 border-t border-light-border dark:border-dark-border">
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

