"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useUserProgress } from "@/lib/useAuth";

type L = { id: string; slug: string; title: string; title_vi: string | null; day: number | null; count: number };

export function FamilyTabs({ collections }: { collections: { slug: string; title: string; lessons: L[] }[] }) {
  const [active, setActive] = useState(collections[0]?.slug);
  const done = useUserProgress("vocab_lesson", true);
  const col = collections.find((c) => c.slug === active) ?? collections[0];
  return (
    <>
      {collections.length > 1 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2 border-b border-ui-line pb-3">
          {collections.map((c) => (
            <button key={c.slug} onClick={() => setActive(c.slug)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${c.slug === col.slug ? "bg-ui-brand-tint text-ui-brand-strong ring-1 ring-ui-brand-line" : "text-ui-muted hover:text-ui-brand-text"}`}>
              {c.title} ({c.lessons.length})
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {col.lessons.map((l, i) => (
          <Link key={l.id} href={`/tu-vung/${col.slug}/${l.slug}`} className="reveal card lift group flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-sky-600 text-sm font-extrabold text-white dark:bg-ui-brand-soft dark:bg-none dark:text-ui-brand-strong">
              {l.day ? `N${l.day}` : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold group-hover:text-ui-brand-strong">{l.title}</div>
              <div className="truncate text-xs text-ui-muted">{l.title_vi ?? ""} · {l.count} từ</div>
            </div>
            {done[l.id] ? <CheckCircle2 className="h-5 w-5 text-ui-emerald-bright" /> : <ChevronRight className="h-5 w-5 text-ui-inactive" />}
          </Link>
        ))}
      </div>
    </>
  );
}
