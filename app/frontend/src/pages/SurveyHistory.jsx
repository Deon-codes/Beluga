import SurveyTable from '../components/surveys/SurveyTable';

export default function SurveyHistory() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Survey History
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          View all processed and ongoing surveys
        </p>
      </div>

      <SurveyTable />
    </div>
  );
}
