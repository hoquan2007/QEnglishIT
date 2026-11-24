import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="qg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#qg)" />
      <circle cx="19" cy="19" r="9.5" fill="none" stroke="white" strokeWidth="3.4" />
      <path d="M23.5 23.5 L30 30" stroke="#fdba74" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ subtitle = "LUYỆN THI TOEIC" }: { subtitle?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[17px] font-extrabold tracking-tight text-ui-title">
          QEnglish<span className="text-ui-brand-bright">IT</span>
        </span>
        <span className="block text-[10px] font-semibold tracking-[0.18em] text-ui-muted">{subtitle}</span>
      </span>
    </Link>
  );
}
