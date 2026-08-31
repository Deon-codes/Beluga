export default function Profile() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">
          Profile
        </h1>
        <p className="text-slate-400">
          Manage your account information
        </p>
      </div>

      <div className="glass-panel max-w-2xl rounded-xl p-6">
        <div className="mb-6 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/15">
            <span className="text-4xl font-bold text-cyan-300">A</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Analyst User
            </h2>
            <p className="text-slate-400">
              analyst@sonar-ai.example.com
            </p>
          </div>
        </div>

        <div className="my-6 h-px bg-cyan-400/15"></div>

        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm text-slate-400">
              Role
            </p>
            <p className="font-medium">
              Marine Analyst
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-400">
              Department
            </p>
            <p className="font-medium">
              Naval Intelligence
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-400">
              Member Since
            </p>
            <p className="font-medium">
              January 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
