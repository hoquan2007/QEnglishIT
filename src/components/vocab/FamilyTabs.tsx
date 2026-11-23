"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

type L = { id: string; slug: string; title: string; title_vi: string | null; day: number | null; count: number; done: boolean };

export function FamilyTabs({ collections }: { collections: { slug: string; title: string; lessons: L[] }[] }) {
  const [active, setActive] = useState(collections[0]?.slug);
  const col = collections.find((c) => c.slug === active) ?? collections[0];
  return (
    <>
      {collections.length > 1 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-3">
          {collections.map((c) => (
            <button key={c.slug} onClick={() => setActive(c.slug)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${c.slug === col.slug ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "text-slate-500 hover:text-brand-600"}`}>
              {c.title} ({c.lessons.length})
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {col.lessons.map((l, i) => (
          <Link key={l.id} href={`/tu-vung/${col.slug}/${l.slug}`} className="card group flex items-center gap-3 p-4 transition hover:shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-sky-600 text-sm font-extrabold text-white">
              {l.day ? `N${l.day}` : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold group-hover:text-brand-700">{l.title}</div>
              <div className="truncate text-xs text-slate-500">{l.title_vi ?? ""} · {l.count} từ</div>
            </div>
            {l.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <ChevronRight className="h-5 w-5 text-slate-300" />}
          </Link>
        ))}
      </div>
    </>
  );
}
