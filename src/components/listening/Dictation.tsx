"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Eye, EyeOff, Headphones, Lightbulb, ListChecks, Pause, PenLine, Play, RotateCcw, TextCursorInput, Volume2, XCircle } from "lucide-react";
import { parseTranscript, speakLines, stopSpeaking, type SpeakLine } from "@/lib/tts";
import { cn, normalizeText } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "cloze" | "check" | "dictate" | "full";
const MODES = [
  { key: "cloze", label: "Điền từ", icon: TextCursorInput },
  { key: "check", label: "Nghe check", icon: ListChecks },
  { key: "dictate", label: "Nghe chép", icon: PenLine },
  { key: "full", label: "Nghe full", icon: Headphones },
] as const;

export type Line = SpeakLine & { vi?: string };

export function linesFromTranscript(t: string, vi?: string | null): Line[] {
  const en = parseTranscript(t);
  const v = parseTranscript(vi ?? "");
  return en.map((l, i) => ({ ...l, vi: v[i]?.text }));
}

async function saveItem(key: string, correct: boolean) {
  const sb = supabaseBrowser();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  const { data: cur } = await sb.from("listening_check_progress").select("attempts, correct").eq("item_key", key).maybeSingle();
  await sb.from("listening_check_progress").upsert({
    user_id: u.user.id, item_key: key, correct: correct || Boolean(cur?.correct), attempts: (cur?.attempts ?? 0) + 1, updated_at: new Date().toISOString(),
  });
  if (correct) await sb.rpc("record_study", { _activity: "listening", _ref: key, _correct: 1, _total: 1, _xp: 1, _seconds: 0 });
}

export function Dictation({
  transcript, transcriptVi, lines: given, keyPrefix, nextHref, defaultMode = "cloze",
}: {
  transcript?: string;
  transcriptVi?: string | null;
  lines?: Line[];
  keyPrefix: string;
  nextHref?: string;
  defaultMode?: Mode;
}) {
  const lines = useMemo(() => given ?? linesFromTranscript(transcript ?? "", transcriptVi), [given, transcript, transcriptVi]);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [rate, setRate] = useState(1);

  useEffect(() => () => stopSpeaking(), []);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => { stopSpeaking(); setMode(m.key); }} className={cn("btn !py-2", mode === m.key ? "btn-primary" : "btn-outline")}>
            <m.icon className="h-4 w-4" />{m.label}
          </button>
        ))}
        <select className="input ml-auto !w-auto !py-2 text-sm" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {[0.6, 0.75, 0.9, 1, 1.15].map((r) => <option key={r} value={r}>Tốc độ {r}x</option>)}
        </select>
      </div>
      <div className="mt-5">
        {mode === "full" ? <FullListen lines={lines} rate={rate} /> : <SentenceDrill key={mode} lines={lines} mode={mode} rate={rate} keyPrefix={keyPrefix} nextHref={nextHref} />}
      </div>
    </div>
  );
}

function FullListen({ lines, rate }: { lines: Line[]; rate: number }) {
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [showEn, setShowEn] = useState(true);
  const [showVi, setShowVi] = useState(false);
  const play = (from = 0) => {
    setPlaying(true);
    speakLines(lines, { rate, startAt: from, onLine: setCur, onEnd: () => { setPlaying(false); setCur(-1); } });
  };
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => (playing ? (stopSpeaking(), setPlaying(false)) : play(Math.max(cur, 0)))}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? "Tạm dừng" : "Phát toàn bài"}
        </button>
        <button className="btn btn-ghost" onClick={() => setShowEn(!showEn)}>{showEn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}Tiếng Anh</button>
        <button className="btn btn-ghost" onClick={() => setShowVi(!showVi)}>{showVi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}Tiếng Việt</button>
      </div>
      <div className="mt-4 space-y-2">
        {lines.map((l, i) => (
          <button key={i} onClick={() => play(i)} className={cn("block w-full rounded-xl p-3 text-left transition", cur === i ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50")}>
            <span className="mr-2 text-xs font-bold text-brand-600">{l.speaker}</span>
            {showEn ? <span className="text-slate-800">{l.text}</span> : <span className="text-slate-300">••••••••••••</span>}
            {showVi && l.vi && <span className="mt-1 block text-sm text-slate-500">{l.vi}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function maskIndexes(text: string) {
  const words = text.split(/\s+/);
  const idx: number[] = [];
  words.forEach((w, i) => {
    const clean = w.replace(/[^A-Za-z']/g, "");
    if (clean.length >= 4 && (i * 7 + clean.length) % 3 === 0) idx.push(i);
  });
  if (!idx.length) {
    const longest = words.reduce((b, w, i) => (w.length > words[b].length ? i : b), 0);
    idx.push(longest);
  }
  return { words, idx };
}

function SentenceDrill({ lines, mode, rate, keyPrefix, nextHref }: { lines: Line[]; mode: Exclude<Mode, "full">; rate: number; keyPrefix: string; nextHref?: string }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [blanks, setBlanks] = useState<Record<number, string>>({});
  const [result, setResult] = useState<null | boolean>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const line = lines[i];
  const mask = useMemo(() => (line ? maskIndexes(line.text) : { words: [], idx: [] }), [line]);

  const play = () => line && speakLines([line], { rate });
  useEffect(() => {
    if (line) {
      const t = setTimeout(() => speakLines([line], { rate }), 300);
      return () => clearTimeout(t);
    }
  }, [line, rate]);

  if (!line) {
    return (
      <div className="card p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <p className="mt-3 text-xl font-extrabold">Hoàn thành! {score}/{lines.length} câu đúng</p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn btn-outline" onClick={() => { setI(0); setScore(0); }}><RotateCcw className="h-4 w-4" />Làm lại</button>
          {nextHref && <Link href={nextHref} className="btn btn-primary">Bài tiếp theo<ChevronRight className="h-4 w-4" /></Link>}
        </div>
      </div>
    );
  }

  function next() {
    setI(i + 1);
    setVal("");
    setBlanks({});
    setResult(null);
    setHint(false);
  }

  function grade(ok: boolean) {
    setResult(ok);
    if (ok) setScore((s) => s + 1);
    saveItem(`${keyPrefix}:${i}`, ok);
  }

  function check() {
    if (mode === "cloze") {
      grade(mask.idx.every((k) => normalizeText(blanks[k] ?? "") === normalizeText(mask.words[k])));
    } else if (mode === "dictate") {
      grade(normalizeText(val) === normalizeText(line.text));
    }
  }

  const typed = normalizeText(val).split(" ");
  const target = line.text.split(/\s+/);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Câu {i + 1}/{lines.length} · <b className="text-brand-600">{line.speaker}</b></span>
        <span>Đúng {score}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(i / lines.length) * 100}%` }} /></div>
      <div className="mt-5 flex justify-center">
        <button onClick={play} className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600" aria-label="Nghe">
          <Volume2 className="h-7 w-7" />
        </button>
      </div>

      {mode === "cloze" && (
        <div className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-lg leading-loose">
          {mask.words.map((w, k) =>
            mask.idx.includes(k) ? (
              <input key={k} disabled={result !== null} value={blanks[k] ?? ""} onChange={(e) => setBlanks({ ...blanks, [k]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && result === null && check()}
                className={cn("rounded-md border-b-2 bg-slate-50 px-1 text-center outline-none",
                  result === null ? "border-brand-300" : normalizeText(blanks[k] ?? "") === normalizeText(w) ? "border-emerald-500 text-emerald-700" : "border-rose-500 text-rose-600")}
                style={{ width: `${Math.max(3, w.length + 1)}ch` }} />
            ) : (
              <span key={k}>{w}</span>
            ),
          )}
        </div>
      )}

      {mode === "dictate" && (
        <textarea autoFocus disabled={result !== null} className="input mt-6 min-h-24 text-lg" placeholder="Gõ lại câu bạn nghe được..."
          value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (result === null) check(); else next(); } }} />
      )}

      {mode === "dictate" && hint && result === null && (
        <p className="mt-2 font-mono text-sm text-slate-400">{target.map((w) => w[0] + "_".repeat(Math.max(0, w.replace(/[^A-Za-z']/g, "").length - 1))).join(" ")}</p>
      )}

      {mode === "check" && result === null && (
        <p className="mt-6 text-center text-slate-500">Nghe kỹ câu, tự nhẩm lại, rồi bấm “Hiện đáp án” để tự đánh giá.</p>
      )}

      {(result !== null || (mode === "check" && hint)) && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-lg">
            {mode === "dictate"
              ? target.map((w, k) => (
                  <span key={k} className={cn("mr-1.5", normalizeText(w) === typed[k] ? "text-emerald-700" : "rounded bg-rose-100 text-rose-700")}>{w}</span>
                ))
              : line.text}
          </p>
          {line.vi && <p className="mt-1 text-sm text-slate-500">{line.vi}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {mode === "check" ? (
          !hint ? (
            <button className="btn btn-primary" onClick={() => setHint(true)}><Eye className="h-4 w-4" />Hiện đáp án</button>
          ) : result === null ? (
            <>
              <button className="btn bg-emerald-500 text-white" onClick={() => grade(true)}><CheckCircle2 className="h-4 w-4" />Nghe được</button>
              <button className="btn bg-rose-500 text-white" onClick={() => grade(false)}><XCircle className="h-4 w-4" />Chưa nghe được</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={next}>Câu tiếp<ChevronRight className="h-4 w-4" /></button>
          )
        ) : result === null ? (
          <>
            {mode === "dictate" && <button className="btn btn-ghost" onClick={() => setHint(true)}><Lightbulb className="h-4 w-4" />Gợi ý</button>}
            <button className="btn btn-ghost" onClick={() => grade(false)}>Bỏ qua</button>
            <button className="btn btn-primary" onClick={check}>Kiểm tra</button>
          </>
        ) : (
          <>
            <span className={cn("flex items-center gap-1 font-semibold", result ? "text-emerald-600" : "text-rose-600")}>
              {result ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}{result ? "Chính xác!" : "Chưa đúng"}
            </span>
            <button className="btn btn-primary" onClick={next}>Câu tiếp<ChevronRight className="h-4 w-4" /></button>
          </>
        )}
      </div>
    </div>
  );
}
