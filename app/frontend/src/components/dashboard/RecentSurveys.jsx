import { surveys } from '../../data/mockData';
import { CheckCircle, Loader } from 'lucide-react';

export default function RecentSurveys() {
  const recentSurveys = surveys.slice(0, 4);

  const getStatusIcon = (status) => {
    if (status === 'Processed') {
      return <CheckCircle size={16} className="text-green-500" />;
    }
    return <Loader size={16} className="text-blue-500 animate-spin" />;
  };

  return (
    <div className="card h-full rounded-2xl p-5">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Recent Surveys</h3>
      <div className="space-y-3">
        {recentSurveys.map((survey) => (
          <div
            key={survey.id}
            className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-sky-200 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-sky-500/40 dark:hover:bg-slate-800"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-slate-900 transition-colors group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-cyan-300">
                  {survey.id}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {survey.location}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(survey.status)}
                <span className="text-[10px] text-slate-500 dark:text-slate-300">
                  {survey.status}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              {survey.status === 'Processed' ? (
                <span>{survey.detections} objects detected</span>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-400"
                      style={{ width: `${survey.progress}%` }}
                    ></div>
                  </div>
                  <span>{survey.progress}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50 dark:text-cyan-300 dark:hover:bg-slate-800">
        View All Surveys →
      </button>
    </div>
  );
}
