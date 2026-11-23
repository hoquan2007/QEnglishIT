"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export function SubTabs({ tabs }: { tabs: { href: string; label: string; icon: keyof typeof Icons }[] }) {
  const pathname = usePathname();
  const activeHref = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(t.href + "/"))?.href;
  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((t) => {
          const Icon = Icons[t.icon] as React.ComponentType<{ className?: string }>;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold",
                activeHref === t.href ? "bg-brand-500 text-white" : "text-brand-700 hover:bg-brand-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
