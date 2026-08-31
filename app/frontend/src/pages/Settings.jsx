export default function Settings() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">
          Settings
        </h1>
        <p className="text-slate-400">
          Configure application preferences
        </p>
      </div>

      <div className="glass-panel max-w-2xl rounded-xl p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Application Settings
        </h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-black/20 p-4">
            <p className="mb-2 font-medium">
              Theme
            </p>
            <p className="text-sm text-slate-400">
              Command display is locked to the SONAR-AI night operations theme.
            </p>
          </div>
          <div className="rounded-lg bg-black/20 p-4">
            <p className="mb-2 font-medium">
              Notifications
            </p>
            <p className="text-sm text-slate-400">
              More settings coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
