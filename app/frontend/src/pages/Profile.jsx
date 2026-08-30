export default function Profile() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Profile
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Manage your account information
        </p>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-ocean-blue/20 dark:bg-cyan/20 flex items-center justify-center">
            <span className="text-4xl font-bold text-ocean-blue dark:text-cyan">A</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
              Analyst User
            </h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              analyst@sonar-ai.example.com
            </p>
          </div>
        </div>

        <div className="h-px bg-light-border dark:bg-dark-border my-6"></div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Role
            </p>
            <p className="font-medium text-light-text dark:text-dark-text">
              Marine Analyst
            </p>
          </div>
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Department
            </p>
            <p className="font-medium text-light-text dark:text-dark-text">
              Naval Intelligence
            </p>
          </div>
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Member Since
            </p>
            <p className="font-medium text-light-text dark:text-dark-text">
              January 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
