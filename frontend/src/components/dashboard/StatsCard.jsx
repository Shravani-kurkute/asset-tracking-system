export default function StatsCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 ${color.accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.soft}`}
        >
          <Icon className={`h-6 w-6 ${color.text}`} />
        </div>
      </div>
    </div>
  );
}
