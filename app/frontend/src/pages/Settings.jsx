export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Settings
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Configure application preferences
        </p>
      </div>

      <div className="card p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
          Application Settings
        </h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-light-surface dark:bg-dark-surface">
            <p className="font-medium text-light-text dark:text-dark-text mb-2">
              Theme
            </p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Toggle between light and dark mode using the button in the top navigation
            </p>
          </div>
          <div className="p-4 rounded-lg bg-light-surface dark:bg-dark-surface">
            <p className="font-medium text-light-text dark:text-dark-text mb-2">
              Notifications
            </p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              More settings coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
