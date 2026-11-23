export function PageHero({
  badge,
  icon,
  title,
  desc,
  right,
}: {
  badge?: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  desc?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-6 rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-sky-50 to-white p-6 md:flex-row md:items-center md:p-8">
      <div className="flex-1">
        {badge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100">
            {icon}
            {badge}
          </span>
        )}
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-slate-600">{desc}</p>}
      </div>
      {right}
    </div>
  );
}
