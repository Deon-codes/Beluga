import { useState } from 'react';
import { Upload, File, CheckCircle2, X } from 'lucide-react';

export default function UploadBox({ onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileList, setFileList] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = (newFiles) => {
    const fileEntries = Array.from(newFiles).map((file, idx) => ({
      id: `${file.name}-${Date.now()}-${idx}`,
      name: file.name,
      size: (file.size / 1024).toFixed(1), // KB
      progress: 0,
      status: 'uploading', // 'uploading' | 'completed'
    }));

    setFileList((prev) => [...prev, ...fileEntries]);

    // Simulate animated upload progress from 0% -> 100%
    fileEntries.forEach((entry) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 25) + 15;

        setFileList((prevList) =>
          prevList.map((item) => {
            if (item.id === entry.id) {
              const updatedProgress = Math.min(currentProgress, 100);
              return {
                ...item,
                progress: updatedProgress,
                status: updatedProgress === 100 ? 'completed' : 'uploading',
              };
            }
            return item;
          })
        );

        if (currentProgress >= 100) {
          clearInterval(interval);
          if (onUploadComplete) onUploadComplete();
        }
      }, 250);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id) => {
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        className={`card p-8 text-center border-2 border-dashed transition-all cursor-pointer ${
          dragActive
            ? 'border-ocean-blue dark:border-cyan bg-ocean-blue/10 dark:bg-cyan/10 scale-[1.01]'
            : 'border-light-border dark:border-dark-border hover:border-ocean-blue dark:hover:border-cyan'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          id="file-upload"
          accept=".png,.jpg,.jpeg,.tiff,.csv,.sonar"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <Upload size={44} className="mx-auto text-ocean-blue dark:text-cyan mb-3 opacity-80 animate-bounce" />
          <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-1">
            Upload Sonar Imagery & Track Files
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
            Drag & drop raw sonar files here or <span className="text-ocean-blue dark:text-cyan underline font-semibold">browse files</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">.SONAR</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">.PNG</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">.TIFF</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">.CSV</span>
          </div>
        </label>
      </div>

      {/* File Upload Progress List */}
      {fileList.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider flex items-center justify-between">
            <span>Selected Files ({fileList.length})</span>
            <span className="text-emerald-500 font-bold">
              {fileList.every((f) => f.status === 'completed') ? '✓ All Files Uploaded' : 'Uploading...'}
            </span>
          </div>

          <div className="space-y-2">
            {fileList.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-light-surface dark:bg-dark-surface rounded-xl border border-light-border dark:border-dark-border"
              >
                <File size={20} className="text-ocean-blue dark:text-cyan shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="truncate text-light-text dark:text-dark-text font-bold">
                      {file.name}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {file.size} KB
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 bg-light-border dark:bg-dark-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        file.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-ocean-blue to-cyan'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-light-text dark:text-dark-text min-w-[36px] text-right font-mono">
                    {file.progress}%
                  </span>

                  {file.status === 'completed' ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
