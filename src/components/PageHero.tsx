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
    <div className="enter mb-6 flex flex-col gap-6 rounded-3xl border border-ui-brand-soft bg-gradient-to-br from-ui-brand-tint via-ui-hero-mid to-ui-surface p-6 md:flex-row md:items-center md:p-8">
      <div className="flex-1">
        {badge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ui-surface/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ui-brand-strong ring-1 ring-ui-brand-soft">
            {icon}
            {badge}
          </span>
        )}
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-ui-secondary">{desc}</p>}
      </div>
      {right}
    </div>
  );
}
