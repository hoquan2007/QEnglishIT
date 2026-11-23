"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import type { QuizItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

// Multiple-choice quiz. "instant" shows feedback per question; otherwise grades at the end.
export function Quiz({
  items,
  instant = true,
  activity,
  refId,
  progressType,
  onDone,
}: {
  items: QuizItem[];
  instant?: boolean;
  activity: string;
  refId: string;
  progressType?: string;
  onDone?: (correct: number, total: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const correct = items.filter((q, i) => answers[i] === q.correct_answer).length;
  const allAnswered = Object.keys(answers).length === items.length;
  const showAll = submitted;

  async function finish() {
    setSubmitted(true);
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (data.user) {
      await sb.rpc("record_study", {
        _activity: activity, _ref: refId, _correct: correct, _total: items.length, _xp: correct * 2,
        _seconds: Math.round((Date.now() - startedAt) / 1000),
      });
      if (progressType) {
        await sb.from("user_progress").upsert({
          user_id: data.user.id, item_type: progressType, item_id: refId,
          status: correct / items.length >= 0.7 ? "completed" : "in_progress",
          score: Math.round((correct / items.length) * 100), updated_at: new Date().toISOString(),
        });
      }
    }
    onDone?.(correct, items.length);
  }

  return (
    <div className="space-y-4">
      {items.map((q, i) => {
        const sel = answers[i];
        const reveal = showAll || (instant && sel !== undefined);
        return (
          <div key={i} className="card p-4">
            <p className="font-medium"><span className="mr-1 font-bold text-brand-600">{i + 1}.</span>{q.question_text}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const isSel = sel === o.key;
                const right = o.key === q.correct_answer;
                return (
                  <button
                    key={o.key}
                    disabled={reveal}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: o.key }))}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm",
                      !reveal && (isSel ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:bg-slate-50"),
                      reveal && right && "border-emerald-400 bg-emerald-50",
                      reveal && isSel && !right && "border-rose-400 bg-rose-50",
                      reveal && !isSel && !right && "border-slate-200 opacity-60",
                    )}
                  >
                    <b className="w-5">{o.key}</b>{o.text}
                  </button>
                );
              })}
            </div>
            {reveal && (
              <div className={cn("mt-3 flex gap-2 rounded-lg p-3 text-sm", sel === q.correct_answer ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>
                {sel === q.correct_answer ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                <div><b>Đáp án {q.correct_answer}.</b> {q.explanation}</div>
              </div>
            )}
          </div>
        );
      })}
      {!submitted ? (
        <button className="btn btn-primary w-full" disabled={!allAnswered} onClick={finish}>
          {allAnswered ? "Hoàn thành & lưu kết quả" : `Đã làm ${Object.keys(answers).length}/${items.length} câu`}
        </button>
      ) : (
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <Trophy className="h-10 w-10 text-amber-500" />
          <div className="flex-1">
            <div className="text-xl font-extrabold">{correct}/{items.length} câu đúng</div>
            <div className="text-sm text-slate-500">+{correct * 2} XP · {correct / items.length >= 0.7 ? "Hoàn thành bài học!" : "Cần đạt 70% để hoàn thành bài."}</div>
          </div>
          <button className="btn btn-outline" onClick={() => { setAnswers({}); setSubmitted(false); }}><RotateCcw className="h-4 w-4" />Làm lại</button>
        </div>
      )}
    </div>
  );
}
