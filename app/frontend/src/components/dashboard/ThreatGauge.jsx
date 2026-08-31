export default function ThreatGauge() {
  const value = 60;
  const r = 70;
  const circ = Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Threat Level</p>
      <div className="relative mx-auto h-28 w-44">
        <svg viewBox="0 0 180 110" className="h-full w-full">
          <path d="M20 100 A70 70 0 0 1 160 100" fill="none" stroke="#1c334d" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M20 100 A70 70 0 0 1 160 100"
            fill="none"
            stroke="url(#threat)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="threat" x1="0" x2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Threat Index</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 text-center text-xs">
        <div><span className="font-bold text-red-400">18</span><div className="text-[10px] text-red-400">HIGH</div></div>
        <div><span className="font-bold text-amber-400">45</span><div className="text-[10px] text-amber-400">MEDIUM</div></div>
        <div><span className="font-bold text-emerald-400">74</span><div className="text-[10px] text-emerald-400">LOW</div></div>
      </div>
    </div>
  );
}
