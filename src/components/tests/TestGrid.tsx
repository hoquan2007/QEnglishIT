"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Clock, Flame, Play, Dumbbell } from "lucide-react";
import type { Attempt, Test } from "@/lib/types";
import { isToeicListeningReading } from "@/lib/toeic";
import { formatNumber } from "@/lib/utils";
import { ModeDialog } from "./ModeDialog";
import { useAuthUser } from "@/lib/useAuth";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Cards rendered per collection before "Xem thêm" — keeps the DOM light on long lists. */
const PAGE = 9;

export function TestGrid({ tests, fixedParts }: { tests: Test[]; fixedParts?: number[] }) {
  const user = useAuthUser();
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabaseBrowser()
      .from("test_attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .then(({ data }) => alive && setAllAttempts((data ?? []) as Attempt[]));
    return () => {
      alive = false;
    };
  }, [user]);
  const attempts = useMemo(() => {
    if (!user) return [];
    const part = fixedParts?.length === 1 ? fixedParts[0] : null;
    return part === null ? allAttempts : allAttempts.filter((a) => a.parts.length === 1 && a.parts[0] === part);
  }, [user, allAttempts, fixedParts]);
  const collections = useMemo(() => {
    const m = new Map<string, number>();
    tests.forEach((t) => m.set(t.collection, (m.get(t.collection) ?? 0) + 1));
    return [...m.entries()];
  }, [tests]);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<{ test: Test; mode: "exam" | "practice" } | null>(null);

  const status = (t: Test) => {
    const mine = attempts.filter((a) => a.test_id === t.id);
    const done = mine.filter((a) => a.status === "submitted" && a.total_score !== null && a.parts.length === 7);
    if (done.length) {
      const best = Math.max(...done.map((a) => a.total_score ?? 0));
      return { label: `Đã làm ${done.length} lần · Cao nhất ${best}/990`, tone: "bg-emerald-50 text-emerald-700" };
    }
    if (mine.some((a) => a.status === "in_progress")) return { label: "Đang làm dở", tone: "bg-amber-50 text-amber-700" };
    if (mine.length) return {
      label: `Đã làm ${mine.length} lần${isToeicListeningReading(t) ? " theo Part" : ""}`,
      tone: "bg-sky-50 text-sky-700",
    };
    return { label: "Chưa làm bài", tone: "bg-slate-50 text-slate-500" };
  };

  const shown = collections.filter(([c]) => filter === "all" || filter === c);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <button className="chip" data-active={filter === "all"} onClick={() => setFilter("all")}>Tất cả ({tests.length})</button>
        {collections.map(([c, n]) => (
          <button key={c} className="chip" data-active={filter === c} onClick={() => setFilter(c)}>{c} ({n})</button>
        ))}
      </div>
      {tests.length === 0 && <div className="card p-10 text-center text-slate-500">Đang cập nhật đề thi...</div>}
      {shown.map(([c, n]) => (
        <section key={c} className="mb-10">
          <h2 className="mb-4 text-lg font-extrabold">{c} <span className="text-sm font-medium text-slate-400">{n} đề</span></h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tests.filter((t) => t.collection === c).slice(0, expanded[c] ? undefined : PAGE).map((t, i) => {
              const st = status(t);
              return (
                <div key={t.id} className="reveal card lift p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
                    <h3 className="font-bold">{t.title}</h3>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                      <Flame className="h-3 w-3" />{formatNumber(t.attempts_count)} lượt làm
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{fixedParts ? "Theo Part" : `${t.total_questions} câu`}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.duration_minutes} phút</span>
                  </div>
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${st.tone}`}>{st.label}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="btn btn-primary !py-2" onClick={() => setDialog({ test: t, mode: "exam" })}><Play className="h-4 w-4" />Thi thử</button>
                    <button className="btn btn-outline !py-2" onClick={() => setDialog({ test: t, mode: "practice" })}><Dumbbell className="h-4 w-4" />Luyện tập</button>
                  </div>
                </div>
              );
            })}
          </div>
          {n > PAGE && (
            <div className="mt-4 text-center">
              <button className="btn btn-outline" onClick={() => setExpanded((e) => ({ ...e, [c]: !e[c] }))}>
                {expanded[c] ? "Thu gọn" : `Xem thêm ${n - PAGE} đề`}
              </button>
            </div>
          )}
        </section>
      ))}
      {dialog && <ModeDialog test={dialog.test} initialMode={dialog.mode} fixedParts={fixedParts} onClose={() => setDialog(null)} />}
    </>
  );
}
