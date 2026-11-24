"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserProgress } from "@/lib/useAuth";

type T = { id: string; slug: string; title: string; title_vi: string | null; level: string; category: string; difficulty: string | null; sort_order: number; summary: string | null };

export function GrammarBrowser({ topics }: { topics: T[] }) {
  const progress = useUserProgress("grammar_topic");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const tabs = useMemo(() => {
    const levels = ["450", "600", "700", "800"].map((l) => ({ key: `lv:${l}`, label: `TOEIC ${l}+`, n: topics.filter((t) => Number(t.level) <= Number(l)).length }));
    const cats = [...new Set(topics.map((t) => t.category))].map((c) => ({ key: `cat:${c}`, label: c, n: topics.filter((t) => t.category === c).length }));
    return [{ key: "all", label: "Tất cả", n: topics.length }, ...levels, ...cats];
  }, [topics]);

  const shown = topics.filter((t) => {
    if (tab.startsWith("lv:") && Number(t.level) > Number(tab.slice(3))) return false;
    if (tab.startsWith("cat:") && t.category !== tab.slice(4)) return false;
    if (onlyTodo && progress[t.id]?.status === "completed") return false;
    const s = q.toLowerCase();
    return !s || t.title.toLowerCase().includes(s) || (t.title_vi ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="mt-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Tìm kiếm bài học hoặc chủ đề..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-outline" onClick={() => setShowFilter((v) => !v)}><SlidersHorizontal className="h-4 w-4" />Bộ lọc</button>
      </div>
      {showFilter && (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyTodo} onChange={(e) => setOnlyTodo(e.target.checked)} /> Chỉ hiện bài chưa hoàn thành
        </label>
      )}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button key={t.key} className="chip" data-active={tab === t.key} onClick={() => setTab(t.key)}>{t.label} ({t.n})</button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => {
          const p = progress[t.id];
          return (
            <Link key={t.id} href={`/ngu-phap-toeic/${t.slug}`} className="reveal card lift group p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">{t.sort_order}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold group-hover:text-brand-700">{t.title}</h3>
                  {t.title_vi && <div className="text-sm text-slate-500">{t.title_vi}</div>}
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  t.difficulty === "Advanced" ? "bg-rose-50 text-rose-600" : t.difficulty === "Intermediate" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                  {t.difficulty ?? "Beginner"}
                </span>
              </div>
              {t.summary && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{t.summary}</p>}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="chip !py-0.5">TOEIC {t.level}+</span>
                <span className="chip !py-0.5">{t.category}</span>
                {p && (
                  <span className={cn("ml-auto flex items-center gap-1 font-semibold", p.status === "completed" ? "text-emerald-600" : "text-amber-600")}>
                    {p.status === "completed" && <CheckCircle2 className="h-4 w-4" />}{p.score ?? 0}%
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {!shown.length && <p className="py-10 text-center text-slate-500">Không tìm thấy bài học phù hợp.</p>}
    </div>
  );
}
