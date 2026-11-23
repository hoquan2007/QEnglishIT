"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock, FileText, Flag, Grid3x3, Image as ImageIcon, Languages, Play, Send,
} from "lucide-react";
import type { Question, QuestionGroup, Test } from "@/lib/types";
import { isListeningPart, PARTS } from "@/lib/toeic";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn, formatDuration } from "@/lib/utils";
import { stopSpeaking } from "@/lib/tts";
import { AudioBar } from "./AudioBar";
import { Markdown } from "@/components/Markdown";
import { ReportButton } from "@/components/ReportButton";
import { ResultView, computeResult } from "./ResultView";
import { LogoMark } from "@/components/Logo";

type Phase = "intro" | "running" | "result" | "review";

export function TestRunner({
  test,
  groups,
  mode,
  parts,
  timeLimitMinutes,
  reviewAttemptId,
}: {
  test: Test;
  groups: QuestionGroup[];
  mode: "exam" | "practice";
  parts: number[];
  timeLimitMinutes: number;
  reviewAttemptId?: string;
}) {
  const router = useRouter();
  const questions = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const [phase, setPhase] = useState<Phase>(reviewAttemptId ? "review" : "intro");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [gi, setGi] = useState(0);
  const [activeQ, setActiveQ] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const group = groups[gi];
  const limit = timeLimitMinutes * 60;
  const remaining = limit ? limit - elapsed : 0;
  const reviewing = phase === "review";

  // Load attempt for review
  useEffect(() => {
    if (!reviewAttemptId) return;
    supabaseBrowser()
      .from("test_attempts")
      .select("answers, time_spent_seconds")
      .eq("id", reviewAttemptId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAnswers(data.answers ?? {});
          setElapsed(data.time_spent_seconds ?? 0);
        }
        setPhase("result");
      });
  }, [reviewAttemptId]);

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const submit = useCallback(async () => {
    stopSpeaking();
    setSaving(true);
    const r = computeResult(questions, answersRef.current, parts);
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (u.user) {
      const payload = {
        answers: answersRef.current,
        status: "submitted",
        correct_listening: r.correctL,
        correct_reading: r.correctR,
        score_listening: r.scoreL,
        score_reading: r.scoreR,
        total_score: r.total,
        time_spent_seconds: elapsed,
        submitted_at: new Date().toISOString(),
      };
      if (attemptId) await sb.from("test_attempts").update(payload).eq("id", attemptId);
      else await sb.from("test_attempts").insert({ ...payload, user_id: u.user.id, test_id: test.id, mode, parts });
      await sb.rpc("record_study", {
        _activity: "test", _ref: test.id, _correct: r.correctL + r.correctR, _total: questions.length,
        _xp: (r.correctL + r.correctR) * 2, _seconds: elapsed,
      });
    }
    await sb.rpc("increment_test_attempts", { _test: test.id });
    setSaving(false);
    setPhase("result");
    window.scrollTo(0, 0);
  }, [questions, parts, elapsed, attemptId, test.id, mode]);

  // Auto-submit at time limit
  useEffect(() => {
    if (phase === "running" && limit && remaining <= 0) {
      const t = setTimeout(submit, 0);
      return () => clearTimeout(t);
    }
  }, [phase, limit, remaining, submit]);

  // Autosave progress every 30s
  useEffect(() => {
    if (phase !== "running" || !attemptId) return;
    const t = setInterval(() => {
      supabaseBrowser().from("test_attempts").update({ answers: answersRef.current, time_spent_seconds: elapsed }).eq("id", attemptId);
    }, 30000);
    return () => clearInterval(t);
  }, [phase, attemptId, elapsed]);

  async function start() {
    setPhase("running");
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (u.user) {
      const { data } = await sb
        .from("test_attempts")
        .insert({ user_id: u.user.id, test_id: test.id, mode, parts })
        .select("id")
        .single();
      if (data) setAttemptId(data.id);
    }
  }

  const choose = useCallback(
    (q: Question, key: string) => {
      if (reviewing || revealed.has(q.id)) return;
      setAnswers((a) => ({ ...a, [q.id]: key }));
      if (mode === "practice") setRevealed((s) => new Set(s).add(q.id));
    },
    [mode, reviewing, revealed],
  );

  const goGroup = useCallback(
    (i: number) => {
      stopSpeaking();
      setGi(Math.max(0, Math.min(groups.length - 1, i)));
      setActiveQ(0);
      setShowPalette(false);
    },
    [groups.length],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "running" && phase !== "review") return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") goGroup(gi + 1);
      else if (e.key === "ArrowLeft") goGroup(gi - 1);
      else if (e.key === "ArrowDown") setActiveQ((a) => Math.min(a + 1, group.questions.length - 1));
      else if (e.key === "ArrowUp") setActiveQ((a) => Math.max(a - 1, 0));
      else if (["1", "2", "3", "4"].includes(e.key)) {
        const q = group.questions[activeQ];
        const opt = q?.options[Number(e.key) - 1];
        if (q && opt) choose(q, opt.key);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, gi, activeQ, group, goGroup, choose]);

  useEffect(() => () => stopSpeaking(), []);

  if (!groups.length) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-slate-500">Đề này chưa có câu hỏi cho phần đã chọn.</p>
          <Link href="/luyen-de-toeic" className="btn btn-primary mt-4">Quay lại danh sách đề</Link>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar onBack={() => router.push("/luyen-de-toeic")} />
        <div className="mx-auto mt-10 max-w-xl px-4">
          <div className="card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><FileText className="h-7 w-7" /></div>
            <h1 className="mt-4 text-2xl font-extrabold">{test.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "exam" ? "Chế độ Luyện thi · Mô phỏng đề thi thật, đáp án ẩn cho đến khi nộp bài." : "Chế độ Luyện tập · Xem đáp án và giải thích ngay sau mỗi câu."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Stat label="Số câu" value={String(questions.length)} />
              <Stat label="Thời gian" value={limit ? `${timeLimitMinutes} phút` : "Không giới hạn"} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {parts.map((p) => <span key={p} className="chip">Part {p}</span>)}
            </div>
            <button className="btn btn-primary mt-6 !px-8" onClick={start}><Play className="h-4 w-4" />Bắt đầu</button>
            <p className="mt-4 text-xs text-slate-400">Audio được đọc bằng giọng đọc của trình duyệt. Hãy bật loa hoặc tai nghe.</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <ResultView
        test={test}
        questions={questions}
        answers={answers}
        parts={parts}
        elapsed={elapsed}
        onReview={() => {
          setRevealed(new Set(questions.map((q) => q.id)));
          setPhase("review");
          goGroup(0);
        }}
        onRetry={() => router.push(`/luyen-de-toeic/${test.slug}?mode=${mode}&parts=${parts.join(",")}${limit ? `&time=${timeLimitMinutes}` : ""}`)}
        saving={saving}
      />
    );
  }

  const isL = isListeningPart(group.part);
  const hasLeft = isL || group.part >= 6 || Boolean(group.passage);
  const answeredCount = questions.filter((q) => answers[q.id]).length;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <TopBar onBack={() => router.push("/luyen-de-toeic")}>
        <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold",
          limit && remaining < 300 ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-700")}>
          <Clock className="h-4 w-4" />
          {reviewing ? "Xem lại" : formatDuration(limit ? remaining : elapsed)}
        </span>
        <span className="hidden text-sm text-slate-500 sm:inline">Đã làm {answeredCount}/{questions.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowVi((v) => !v)} className={cn("btn btn-ghost !px-2.5 !py-1.5", showVi && "bg-brand-50 !text-brand-700")} title="Bản dịch">
            <Languages className="h-4 w-4" />
          </button>
          <button onClick={() => setShowPalette((v) => !v)} className="btn btn-ghost !px-2.5 !py-1.5" title="Danh sách câu">
            <Grid3x3 className="h-4 w-4" />
          </button>
          {reviewing ? (
            <button className="btn btn-primary !py-1.5" onClick={() => setPhase("result")}>Kết quả</button>
          ) : (
            <button
              className="btn btn-primary !py-1.5"
              disabled={saving}
              onClick={() => {
                const left = questions.length - answeredCount;
                if (confirm(left ? `Bạn còn ${left} câu chưa làm. Nộp bài?` : "Nộp bài?")) submit();
              }}
            >
              <Send className="h-4 w-4" />Nộp bài
            </button>
          )}
        </div>
      </TopBar>

      <div className="relative flex min-h-0 flex-1">
        <div className={cn("grid min-h-0 flex-1", hasLeft ? "lg:grid-cols-2" : "grid-cols-1")}>
          {hasLeft && (
            <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-brand-50/40 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-700">
                {PARTS[group.part - 1].name} · {PARTS[group.part - 1].title}
              </div>
              {isL && (
                <AudioBar key={group.id} transcript={group.transcript} audioUrl={group.audio_url} autoPlay={mode === "exam" && !reviewing} />
              )}
              {group.part === 1 && <PhotoCard group={group} />}
              {group.passage && (
                <div className="card mt-4 p-5">
                  <Markdown className="prose-sm">{group.passage}</Markdown>
                  {showVi && group.passage_vi && (
                    <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                      <Markdown className="prose-sm text-slate-600">{group.passage_vi}</Markdown>
                    </div>
                  )}
                </div>
              )}
              {isL && (reviewing || group.questions.every((q) => revealed.has(q.id))) && group.transcript && (
                <div className="card mt-4 p-4 text-sm">
                  <div className="mb-2 font-bold text-slate-700">Transcript</div>
                  <pre className="whitespace-pre-wrap font-sans text-slate-700">{group.transcript}</pre>
                  {group.transcript_vi && <pre className="mt-3 whitespace-pre-wrap border-t border-dashed pt-3 font-sans text-slate-500">{group.transcript_vi}</pre>}
                </div>
              )}
            </div>
          )}
          <div className="min-h-0 overflow-y-auto p-4">
            {!hasLeft && <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-700">{PARTS[group.part - 1].name} · {PARTS[group.part - 1].title}</div>}
            <div className="mx-auto max-w-3xl space-y-4">
              {group.questions.map((q, qi) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  active={qi === activeQ}
                  selected={answers[q.id]}
                  revealed={revealed.has(q.id)}
                  hideOptionText={(q.part === 1 || q.part === 2) && !revealed.has(q.id)}
                  flagged={flagged.has(q.id)}
                  showVi={showVi}
                  onFocus={() => setActiveQ(qi)}
                  onChoose={(k) => choose(q, k)}
                  onFlag={() =>
                    setFlagged((s) => {
                      const n = new Set(s);
                      if (n.has(q.id)) n.delete(q.id);
                      else n.add(q.id);
                      return n;
                    })
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {showPalette && (
          <div className="absolute inset-y-0 right-0 z-20 w-80 overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 font-bold">Danh sách câu hỏi</div>
            {parts.map((p) => {
              const qs = questions.filter((q) => q.part === p);
              if (!qs.length) return null;
              return (
                <div key={p} className="mb-4">
                  <div className="mb-1.5 text-xs font-semibold text-slate-500">Part {p}</div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {qs.map((q) => {
                      const g = groups.findIndex((x) => x.id === q.group_id);
                      const state = reviewing || revealed.has(q.id)
                        ? answers[q.id] === q.correct_answer ? "bg-emerald-500 text-white" : answers[q.id] ? "bg-rose-500 text-white" : "bg-slate-200"
                        : answers[q.id] ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600";
                      return (
                        <button key={q.id} onClick={() => goGroup(g)} className={cn("relative rounded-md py-1.5 text-xs font-semibold", state, g === gi && "ring-2 ring-brand-300")}>
                          {q.number}
                          {flagged.has(q.id) && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5">
        <ReportButton questionId={group.questions[activeQ]?.id} />
        <div className="flex items-center gap-2">
          <button className="btn btn-outline !py-1.5" disabled={gi === 0} onClick={() => goGroup(gi - 1)}><ChevronLeft className="h-4 w-4" />Trước</button>
          <span className="text-sm text-slate-500">
            Câu {group.questions[0]?.number}
            {group.questions.length > 1 && `–${group.questions.at(-1)?.number}`}
          </span>
          <button className="btn btn-primary !py-1.5" disabled={gi === groups.length - 1} onClick={() => goGroup(gi + 1)}>Tiếp<ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onBack, children }: { onBack: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <button onClick={onBack} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
      <LogoMark size={30} />
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}

function PhotoCard({ group }: { group: QuestionGroup }) {
  if (group.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={group.image_url} alt={group.image_description ?? "Part 1"} className="mt-4 w-full rounded-2xl object-cover" />;
  }
  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-6 text-slate-100">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400"><ImageIcon className="h-4 w-4" />Mô tả hình ảnh</div>
      <p className="text-[15px] leading-relaxed">{group.image_description}</p>
    </div>
  );
}

function QuestionCard({
  q, active, selected, revealed, hideOptionText, flagged, showVi, onFocus, onChoose, onFlag,
}: {
  q: Question;
  active: boolean;
  selected?: string;
  revealed: boolean;
  hideOptionText: boolean;
  flagged: boolean;
  showVi: boolean;
  onFocus: () => void;
  onChoose: (k: string) => void;
  onFlag: () => void;
}) {
  return (
    <div onClick={onFocus} className={cn("card p-4 transition", active && "ring-2 ring-brand-200")}>
      <div className="flex items-start gap-2">
        <span className="font-bold text-brand-600">Câu {q.number}.</span>
        <p className="flex-1 font-medium text-slate-800">{q.question_text ?? (q.part === 2 ? "Mark your answer on your answer sheet." : "")}</p>
        <button onClick={onFlag} className={cn("rounded p-1", flagged ? "text-orange-500" : "text-slate-300 hover:text-slate-500")} aria-label="Đánh dấu">
          <Flag className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {q.options.map((o) => {
          const isSel = selected === o.key;
          const isRight = o.key === q.correct_answer;
          return (
            <button
              key={o.key}
              onClick={() => onChoose(o.key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                !revealed && isSel && "border-brand-400 bg-brand-50",
                !revealed && !isSel && "border-slate-200 hover:border-brand-300 hover:bg-slate-50",
                revealed && isRight && "border-emerald-400 bg-emerald-50",
                revealed && isSel && !isRight && "border-rose-400 bg-rose-50",
                revealed && !isSel && !isRight && "border-slate-200 opacity-70",
              )}
            >
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                isSel ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600",
                revealed && isRight && "bg-emerald-500 text-white",
                revealed && isSel && !isRight && "bg-rose-500 text-white")}>
                {o.key}
              </span>
              {!hideOptionText && <span>{o.text}</span>}
            </button>
          );
        })}
      </div>
      {revealed && (q.explanation || q.translation) && (
        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div>
            <span className="font-semibold">Đáp án đúng: </span>
            <span className="font-bold text-emerald-600">{q.correct_answer}</span>
            {selected && selected !== q.correct_answer && <span className="ml-2 text-rose-600">(Bạn chọn {selected})</span>}
            {!selected && <span className="ml-2 text-slate-400">(Bỏ trống)</span>}
          </div>
          {q.explanation && <div className="text-slate-700"><span className="font-semibold">Giải thích: </span>{q.explanation}</div>}
          {(showVi || revealed) && q.translation && <div className="text-slate-500"><span className="font-semibold">Dịch: </span>{q.translation}</div>}
        </div>
      )}
    </div>
  );
}
