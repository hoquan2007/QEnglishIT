"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Ear, Layers, List, ListChecks, PenLine, RotateCcw, Shuffle, Trophy, Volume2, FolderPlus } from "lucide-react";
import type { VocabWord } from "@/lib/types";
import { speakWord } from "@/lib/tts";
import { cn, normalizeText, shuffle } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";
import { nextReview } from "@/lib/srs";
import { CartButton } from "./CartButton";
import { AddToSet } from "./AddToSet";
import { WordPronunciation } from "./WordPronunciation";

type Mode = "list" | "flash" | "quiz" | "spell";
const MODES = [
  { key: "list", label: "Danh sách", icon: List },
  { key: "flash", label: "Flashcard", icon: Layers },
  { key: "quiz", label: "Trắc nghiệm", icon: ListChecks },
  { key: "spell", label: "Nghe – viết", icon: Ear },
] as const;

export function VocabLesson({ lessonId, words, nextHref }: { lessonId: string; words: VocabWord[]; nextHref?: string }) {
  const [mode, setMode] = useState<Mode>("list");
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)} className={cn("btn !py-2", mode === m.key ? "btn-primary" : "btn-outline")}>
            <m.icon className="h-4 w-4" />{m.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {mode === "list" && <WordList words={words} />}
        {mode === "flash" && <Flashcards words={words} />}
        {mode === "quiz" && <VocabQuiz words={words} lessonId={lessonId} nextHref={nextHref} />}
        {mode === "spell" && <Spelling words={words} lessonId={lessonId} />}
      </div>
    </div>
  );
}

export function WordList({ words }: { words: VocabWord[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {words.map((w, i) => (
        <div key={w.id} className="card flex gap-3 p-4">
          <span className="w-6 text-sm font-bold text-ui-inactive">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-ui-brand-strong">{w.word}</span>
              {w.pos && <span className="rounded bg-ui-subtle px-1.5 text-xs text-ui-muted">{w.pos}</span>}
              {w.cefr && <span className="text-[10px] font-bold text-ui-violet-bright">{w.cefr}</span>}
            </div>
            <WordPronunciation word={w} />
            <div className="font-medium text-ui-strong">{w.meaning_vi}</div>
            {(w.examples?.length ? w.examples : [{ en: w.example_en, vi: w.example_vi }]).map((example, index) => (
              <div key={index} className="mt-1">
                {example.en && <p className="text-sm italic text-ui-secondary">{example.en}</p>}
                {example.vi && <p className="text-sm text-ui-muted">{example.vi}</p>}
              </div>
            ))}
            {w.collocations?.map(({ en, vi }) => (
              <p key={en} className="mt-1 text-sm text-ui-secondary"><strong>{en}</strong> · {vi}</p>
            ))}
            {!!w.word_family?.length && <p className="mt-1 text-sm text-ui-secondary">
              <strong>Họ từ</strong> · {w.word_family.map(({ word, pos }) => `${word} (${pos})`).join(", ")}
            </p>}
          </div>
          <div className="flex flex-col items-center gap-1">
            <CartButton wordId={w.id} />
            <AddToSet wordId={w.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Flashcards({ words: initial, onRated }: { words: VocabWord[]; onRated?: () => void }) {
  const [words, setWords] = useState(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const w = words[i];

  useEffect(() => {
    if (w) speakWord(w);
  }, [w]);

  async function rate(r: 0 | 1 | 2 | 3) {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (u.user && w) {
      const { data: cur } = await sb.from("user_vocab_progress").select("ease, interval_days, reps, lapses").eq("word_id", w.id).maybeSingle();
      const n = nextReview(cur ?? { ease: 2.5, interval_days: 0, reps: 0, lapses: 0 }, r);
      await sb.from("user_vocab_progress").upsert({ user_id: u.user.id, word_id: w.id, ...n, updated_at: new Date().toISOString() });
    }
    onRated?.();
    setFlipped(false);
    setI((x) => Math.min(x + 1, words.length));
  }

  if (!w) {
    return (
      <div className="card p-10 text-center">
        <Trophy className="mx-auto h-12 w-12 text-ui-amber-bright" />
        <p className="mt-3 text-lg font-bold">Hoàn thành {words.length} thẻ!</p>
        <button className="btn btn-outline mt-4" onClick={() => { setI(0); setFlipped(false); }}><RotateCcw className="h-4 w-4" />Học lại</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-ui-muted">
        <span>Thẻ {i + 1}/{words.length}</span>
        <button className="flex items-center gap-1 hover:text-ui-brand-text" onClick={() => { setWords(shuffle(words)); setI(0); }}><Shuffle className="h-4 w-4" />Trộn thẻ</button>
      </div>
      <button key={`${i}-${flipped}`} onClick={() => setFlipped((f) => !f)} className="card flip-in grid min-h-72 w-full place-items-center p-8 text-center shadow-lg">
        {!flipped ? (
          <div>
            <div className="text-4xl font-extrabold text-ui-brand-strong">{w.word}</div>
            <div className="mt-2 text-ui-faint">{w.ipa} {w.pos && `· ${w.pos}`}</div>
            <div className="mt-6 text-xs text-ui-faint">Nhấn để lật thẻ</div>
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold">{w.meaning_vi}</div>
            {w.definition_en && <div className="mt-2 text-sm text-ui-muted">{w.definition_en}</div>}
            {w.example_en && <div className="mt-4 italic text-ui-body">{w.example_en}</div>}
            {w.example_vi && <div className="text-sm text-ui-faint">{w.example_vi}</div>}
          </div>
        )}
      </button>
      <div className="mt-3 flex justify-center">
        <button onClick={() => speakWord(w)} className="btn btn-ghost"><Volume2 className="h-4 w-4" />Phát âm</button>
      </div>
      {flipped ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {([
            [0, "Quên", "bg-rose-500 dark:bg-ui-rose-fill"],
            [1, "Khó", "bg-amber-500 dark:bg-amber-800"],
            [2, "Được", "bg-sky-500 dark:bg-sky-700"],
            [3, "Dễ", "bg-emerald-500 dark:bg-ui-emerald-fill"],
          ] as const).map(([r, l, c]) => (
            <button key={r} onClick={() => rate(r)} className={`btn ${c} text-white`}>{l}</button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex justify-between">
          <button className="btn btn-outline" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4" />Trước</button>
          <button className="btn btn-primary" onClick={() => setFlipped(true)}>Lật thẻ</button>
          <button className="btn btn-outline" onClick={() => setI(i + 1)}>Bỏ qua<ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

async function saveLesson(lessonId: string, correct: number, total: number, activity = "vocab") {
  const sb = supabaseBrowser();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  await sb.rpc("record_study", { _activity: activity, _ref: lessonId, _correct: correct, _total: total, _xp: correct, _seconds: 0 });
  await sb.from("user_progress").upsert({
    user_id: u.user.id, item_type: "vocab_lesson", item_id: lessonId,
    status: correct / total >= 0.8 ? "completed" : "in_progress", score: Math.round((correct / total) * 100), updated_at: new Date().toISOString(),
  });
}

function VocabQuiz({ words, lessonId, nextHref }: { words: VocabWord[]; lessonId: string; nextHref?: string }) {
  const questions = useMemo(
    () =>
      shuffle(words).map((w, idx) => {
        const reverse = idx % 2 === 1;
        const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3);
        const opts = shuffle([w, ...others]);
        return { w, reverse, opts };
      }),
    [words],
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[i];

  if (!q) {
    return (
      <div className="card p-10 text-center">
        <Trophy className="mx-auto h-12 w-12 text-ui-amber-bright" />
        <p className="mt-3 text-2xl font-extrabold">{score}/{questions.length}</p>
        <p className="text-ui-muted">{score / questions.length >= 0.8 ? "Tuyệt vời! Bài học đã hoàn thành." : "Cần đạt 80% để hoàn thành bài."}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn btn-outline" onClick={() => { setI(0); setScore(0); setPicked(null); }}><RotateCcw className="h-4 w-4" />Làm lại</button>
          {nextHref && <Link href={nextHref} className="btn btn-primary">Bài tiếp theo<ChevronRight className="h-4 w-4" /></Link>}
        </div>
      </div>
    );
  }

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const ok = id === q.w.id;
    if (ok) setScore((s) => s + 1);
    if (!q.reverse) speakWord(q.w);
    setTimeout(() => {
      const last = i === questions.length - 1;
      if (last) saveLesson(lessonId, score + (ok ? 1 : 0), questions.length);
      setPicked(null);
      setI(i + 1);
    }, 1100);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex justify-between text-sm text-ui-muted"><span>Câu {i + 1}/{questions.length}</span><span>Đúng {score}</span></div>
      <div className="h-2 rounded-full bg-ui-subtle"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(i / questions.length) * 100}%` }} /></div>
      <div className="card mt-4 p-8 text-center">
        <div className="text-xs uppercase tracking-wider text-ui-faint">{q.reverse ? "Chọn từ tiếng Anh đúng" : "Chọn nghĩa đúng"}</div>
        <div className="mt-2 text-3xl font-extrabold text-ui-brand-strong">{q.reverse ? q.w.meaning_vi : q.w.word}</div>
      </div>
      <div className="mt-3 grid gap-2">
        {q.opts.map((o) => (
          <button key={o.id} onClick={() => pick(o.id)}
            className={cn("rounded-xl border px-4 py-3 text-left font-medium",
              !picked && "border-ui-line bg-ui-surface hover:border-ui-brand-outline",
              picked && o.id === q.w.id && "border-emerald-400 bg-ui-emerald-tint",
              picked === o.id && o.id !== q.w.id && "border-rose-400 bg-ui-rose-tint")}>
            {q.reverse ? o.word : o.meaning_vi}
          </button>
        ))}
      </div>
    </div>
  );
}

function Spelling({ words, lessonId }: { words: VocabWord[]; lessonId: string }) {
  const list = useMemo(() => shuffle(words), [words]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "bad">("idle");
  const [score, setScore] = useState(0);
  const w = list[i];

  useEffect(() => {
    if (w) speakWord(w);
  }, [w]);

  if (!w) {
    return (
      <div className="card p-10 text-center">
        <Trophy className="mx-auto h-12 w-12 text-ui-amber-bright" />
        <p className="mt-3 text-2xl font-extrabold">{score}/{list.length} từ viết đúng</p>
        <button className="btn btn-outline mt-4" onClick={() => { setI(0); setScore(0); }}><RotateCcw className="h-4 w-4" />Làm lại</button>
      </div>
    );
  }

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "idle") {
      if (i === list.length - 1) saveLesson(lessonId, score, list.length, "vocab");
      setI(i + 1);
      setVal("");
      setState("idle");
      return;
    }
    const ok = normalizeText(val) === normalizeText(w.word);
    if (ok) setScore((s) => s + 1);
    setState(ok ? "ok" : "bad");
  }

  return (
    <form onSubmit={check} className="mx-auto max-w-xl">
      <div className="mb-2 text-sm text-ui-muted">Từ {i + 1}/{list.length} · Đúng {score}</div>
      <div className="card p-8 text-center">
        <button type="button" onClick={() => speakWord(w)} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ui-brand-fill text-white shadow-lg hover:bg-ui-brand-fill-hover" aria-label="Nghe lại">
          <Volume2 className="h-7 w-7" />
        </button>
        <p className="mt-3 text-sm text-ui-muted">Gợi ý: {w.meaning_vi}</p>
        <input autoFocus className={cn("input mt-4 text-center text-lg", state === "ok" && "!border-emerald-400", state === "bad" && "!border-rose-400")}
          value={val} onChange={(e) => setVal(e.target.value)} disabled={state !== "idle"} placeholder="Gõ từ bạn nghe được..." />
        {state !== "idle" && (
          <p className={cn("mt-3 font-semibold", state === "ok" ? "text-ui-emerald-text" : "text-ui-rose-text")}>
            {state === "ok" ? "Chính xác!" : <>Đáp án: <b>{w.word}</b> {w.ipa}</>}
          </p>
        )}
        <button className="btn btn-primary mt-4 w-full"><PenLine className="h-4 w-4" />{state === "idle" ? "Kiểm tra" : "Tiếp tục"}</button>
      </div>
    </form>
  );
}

export { FolderPlus };
