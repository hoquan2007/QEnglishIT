"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Eye, RotateCcw, XCircle, MinusCircle, ListChecks } from "lucide-react";
import type { Question, Test } from "@/lib/types";
import { getTestPartLabel, isListeningPart, isToeicListeningReading, scaleListening, scaleReading, scoreLevel } from "@/lib/toeic";
import { formatDuration } from "@/lib/utils";
import { LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function computeResult(questions: Question[], answers: Record<string, string>, parts: number[], toeic: boolean) {
  const L = toeic ? questions.filter((q) => isListeningPart(q.part)) : [];
  const R = toeic ? questions.filter((q) => !isListeningPart(q.part)) : questions;
  const correctL = L.filter((q) => answers[q.id] === q.correct_answer).length;
  const correctR = R.filter((q) => answers[q.id] === q.correct_answer).length;
  const hasL = toeic && parts.some((p) => p <= 4);
  const hasR = toeic && parts.some((p) => p >= 5);
  const scoreL = hasL && L.length ? scaleListening(correctL, L.length) : null;
  const scoreR = hasR && R.length ? scaleReading(correctR, R.length) : null;
  const total = scoreL !== null && scoreR !== null ? scoreL + scoreR : null;
  return { correctL, correctR, totalL: L.length, totalR: R.length, scoreL, scoreR, total };
}

export function ResultView({
  test, questions, answers, parts, elapsed, onReview, onRetry, saving,
}: {
  test: Test;
  questions: Question[];
  answers: Record<string, string>;
  parts: number[];
  elapsed: number;
  onReview: () => void;
  onRetry: () => void;
  saving?: boolean;
}) {
  const r = computeResult(questions, answers, parts, isToeicListeningReading(test));
  const correct = r.correctL + r.correctR;
  const wrong = questions.filter((q) => answers[q.id] && answers[q.id] !== q.correct_answer).length;
  const skipped = questions.length - correct - wrong;
  const lvl = r.total !== null ? scoreLevel(r.total) : null;

  const byPart = parts.map((p) => {
    const qs = questions.filter((q) => q.part === p);
    const c = qs.filter((q) => answers[q.id] === q.correct_answer).length;
    return { p, c, n: qs.length, pct: qs.length ? Math.round((c / qs.length) * 100) : 0 };
  });

  const tagStats = new Map<string, { c: number; n: number }>();
  questions.forEach((q) =>
    (q.tags ?? []).forEach((t) => {
      const s = tagStats.get(t) ?? { c: 0, n: 0 };
      s.n++;
      if (answers[q.id] === q.correct_answer) s.c++;
      tagStats.set(t, s);
    }),
  );
  const weak = [...tagStats.entries()].filter(([, s]) => s.n >= 2).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).slice(0, 6);

  return (
    <div className="min-h-screen bg-ui-canvas pb-16">
      <div className="flex h-14 items-center gap-3 border-b border-ui-line bg-ui-surface px-4">
        <Link href="/luyen-de-toeic"><LogoMark size={30} /></Link>
        <span className="min-w-0 flex-1 truncate font-semibold">Kết quả · {test.title}</span>
        {saving && <span className="text-xs text-ui-faint">Đang lưu...</span>}
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="card bg-gradient-to-br from-ui-brand-fill to-sky-700 p-6 text-white">
            <div className="text-sm text-brand-100">{r.total !== null ? "Điểm TOEIC ước tính" : "Kết quả luyện tập"}</div>
            {r.total !== null ? (
              <>
                <div className="mt-1 text-6xl font-extrabold">{r.total}<span className="text-2xl text-brand-100">/990</span></div>
                <div className="mt-1 font-semibold">{lvl?.label} · CEFR {lvl?.cefr}</div>
              </>
            ) : (
              <div className="mt-1 text-6xl font-extrabold">{correct}<span className="text-2xl text-brand-100">/{questions.length}</span></div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {r.scoreL !== null && <ScoreBox label="Listening" score={r.scoreL} sub={`${r.correctL}/${r.totalL} câu`} />}
              {r.scoreR !== null && <ScoreBox label="Reading" score={r.scoreR} sub={`${r.correctR}/${r.totalR} câu`} />}
            </div>
          </div>
          <div className="card grid grid-cols-2 gap-3 p-5">
            <Mini icon={<CheckCircle2 className="h-5 w-5 text-ui-emerald-bright" />} label="Đúng" value={correct} />
            <Mini icon={<XCircle className="h-5 w-5 text-ui-rose-bright" />} label="Sai" value={wrong} />
            <Mini icon={<MinusCircle className="h-5 w-5 text-ui-faint" />} label="Bỏ qua" value={skipped} />
            <Mini icon={<Clock className="h-5 w-5 text-ui-brand-bright" />} label="Thời gian" value={formatDuration(elapsed)} />
            <button className="btn btn-primary col-span-2" onClick={onReview}><Eye className="h-4 w-4" />Xem đáp án & giải thích</button>
            <button className="btn btn-outline" onClick={onRetry}><RotateCcw className="h-4 w-4" />Làm lại</button>
            <Link className="btn btn-outline" href="/luyen-de-toeic/tien-do"><ListChecks className="h-4 w-4" />Lịch sử</Link>
          </div>
        </div>

        <div className="card mt-4 p-5">
          <h2 className="font-bold">Kết quả theo phần</h2>
          <div className="mt-4 space-y-3">
            {byPart.map((b) => (
              <div key={b.p} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
                <span className="font-semibold">{getTestPartLabel(test, b.p)}</span>
                <div className="h-3 rounded-full bg-ui-subtle">
                  <div className={`h-3 rounded-full ${b.pct >= 75 ? "bg-emerald-500" : b.pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${b.pct}%` }} />
                </div>
                <span className="text-right text-ui-secondary">{b.c}/{b.n} · {b.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {weak.length > 0 && (
          <div className="card mt-4 p-5">
            <h2 className="font-bold">Dạng câu cần cải thiện</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {weak.map(([t, s]) => (
                <span key={t} className="chip !border-ui-rose-line !bg-ui-rose-tint !text-ui-rose-strong">{t} · {s.c}/{s.n}</span>
              ))}
            </div>
            <p className="mt-3 text-sm text-ui-muted">
              Ôn lại tại <Link href="/ngu-phap-toeic" className="text-ui-brand-text underline">Ngữ pháp TOEIC</Link> hoặc luyện riêng từng Part.
            </p>
          </div>
        )}

        <div className="card mt-4 p-5">
          <h2 className="font-bold">Bảng đáp án</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {questions.map((q) => {
              const a = answers[q.id];
              const ok = a === q.correct_answer;
              return (
                <div key={q.id} className={`rounded-md px-1 py-1 text-center text-xs ${ok ? "bg-ui-emerald-tint text-ui-emerald-strong" : a ? "bg-ui-rose-tint text-ui-rose-strong" : "bg-ui-canvas text-ui-faint"}`}>
                  <b>{q.number}</b> {a ?? "–"}{!ok && <span className="text-ui-emerald-text">→{q.correct_answer}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, score, sub }: { label: string; score: number; sub: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <div className="text-xs text-brand-100">{label}</div>
      <div className="text-2xl font-extrabold">{score}<span className="text-sm">/495</span></div>
      <div className="text-xs text-brand-100">{sub}</div>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-ui-canvas p-3">
      {icon}
      <div>
        <div className="text-xs text-ui-muted">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </div>
  );
}
