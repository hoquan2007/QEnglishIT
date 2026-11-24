"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Layers, List, Search, Volume2, BookOpen, RotateCcw } from "lucide-react";
import { KIND_LABELS, makeLessons, matchesPhrase, quizOptions, type Phrase, type PhraseKind } from "@/lib/common-phrases";
import { speak, stopSpeaking } from "@/lib/tts";

const STORAGE_KEY = "qenglishit:common-phrases:learned:v1";
const CHANGE_EVENT = "qenglishit:common-phrases:change";
const EMPTY = "[]";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readProgress() {
  try { return localStorage.getItem(STORAGE_KEY) ?? EMPTY; } catch { return EMPTY; }
}

function parseProgress(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

type Mode = "list" | "flashcard" | "quiz";
type Filter = "all" | PhraseKind;

export function PhraseStudy({ phrases }: { phrases: Phrase[] }) {
  const saved = useSyncExternalStore(subscribe, readProgress, () => EMPTY);
  const [temporary, setTemporary] = useState<string[] | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const ids = new Set(phrases.map(phrase => phrase.id));
  const learned = new Set((temporary ?? parseProgress(saved)).filter(id => ids.has(id)));
  const [category, setCategory] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [lessonNumber, setLessonNumber] = useState(1);
  const [mode, setMode] = useState<Mode>("list");
  const [searchPage, setSearchPage] = useState(0);
  const lessons = makeLessons(phrases);
  const visibleLessons = lessons.filter(lesson => category === "all" || lesson.kind === category);
  const lesson = lessons.find(item => item.number === lessonNumber) ?? lessons[0];
  const searching = query.trim().length > 0;
  const results = searching ? phrases.filter(phrase => (category === "all" || phrase.kind === category) && matchesPhrase(phrase, query)) : lesson.phrases;
  const pageSize = 20;
  const displayed = searching ? results.slice(searchPage * pageSize, (searchPage + 1) * pageSize) : results;

  useEffect(() => () => stopSpeaking(), []);

  function toggleLearned(id: string) {
    const next = new Set((temporary ?? parseProgress(readProgress())).filter(value => ids.has(value)));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const values = [...next];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      setTemporary(null);
      setStorageFailed(false);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setTemporary(values);
      setStorageFailed(true);
    }
  }

  function selectLesson(number: number) {
    stopSpeaking();
    setLessonNumber(number);
    setQuery("");
    setSearchPage(0);
  }

  function selectCategory(value: Filter) {
    stopSpeaking();
    setCategory(value);
    setSearchPage(0);
    const first = lessons.find(item => value === "all" || item.kind === value);
    if (first && value !== "all" && lesson.kind !== value) setLessonNumber(first.number);
  }

  const percent = Math.round(learned.size / phrases.length * 100);

  return (
    <div className="space-y-5">
      <section className="card p-5" aria-label="Tiến độ học">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold">Tiến độ của bạn</h2><p className="mt-1 text-sm text-slate-500" aria-live="polite">{learned.size}/{phrases.length} cụm đã thuộc · {lessons.filter(item => item.phrases.every(phrase => learned.has(phrase.id))).length}/50 bài hoàn thành</p></div>
          <span className="text-2xl font-extrabold text-brand-700">{percent}%</span>
        </div>
        <progress className="mt-4 h-2.5 w-full overflow-hidden rounded-full accent-cyan-600" value={learned.size} max={phrases.length} aria-label="Số cụm đã thuộc" />
        <p className="mt-2 text-xs text-slate-500">{storageFailed ? "Không thể lưu trên thiết bị. Tiến độ chỉ được giữ trong phiên hiện tại." : "Tiến độ được lưu trên trình duyệt này."}</p>
      </section>

      <section className="card space-y-4 p-4 sm:p-5" aria-label="Chọn bài học">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input className="input pl-10" type="search" aria-label="Tìm cụm từ tiếng Anh hoặc tiếng Việt" placeholder="Tìm cụm từ hoặc nghĩa tiếng Việt..." value={query} onChange={event => { stopSpeaking(); setQuery(event.target.value); setSearchPage(0); }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "conversation", "verb", "collocation"] as const).map(value => (
            <button key={value} type="button" className="chip" data-active={category === value} aria-pressed={category === value} onClick={() => selectCategory(value)}>
              {value === "all" ? "Tất cả" : KIND_LABELS[value]} ({value === "all" ? phrases.length : phrases.filter(phrase => phrase.kind === value).length})
            </button>
          ))}
        </div>
        {!searching && <div>
          <label htmlFor="phrase-lesson" className="mb-2 block text-sm font-semibold text-slate-700">Bài học</label>
          <select id="phrase-lesson" className="input" value={lessonNumber} onChange={event => selectLesson(Number(event.target.value))}>
            {visibleLessons.map(item => <option key={item.number} value={item.number}>Bài {item.number} · {KIND_LABELS[item.kind]} ({item.phrases.filter(phrase => learned.has(phrase.id)).length}/20)</option>)}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-outline" disabled={visibleLessons[0].number === lessonNumber} onClick={() => selectLesson(lessonNumber - 1)}><ArrowLeft size={16} /> Bài trước</button>
            <button className="btn btn-outline" disabled={visibleLessons[visibleLessons.length - 1].number === lessonNumber} onClick={() => selectLesson(lessonNumber + 1)}>Bài sau <ArrowRight size={16} /></button>
          </div>
        </div>}
      </section>

      <section aria-label="Nội dung học">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{searching ? "Kết quả tìm kiếm (" + results.length + ")" : "Bài " + lesson.number + " · " + KIND_LABELS[lesson.kind]}</h2>
          {!searching && <div className="flex flex-wrap gap-1" aria-label="Chế độ học">
            {([{ value: "list", label: "Danh sách", icon: List }, { value: "flashcard", label: "Flashcard", icon: Layers }, { value: "quiz", label: "Luyện tập", icon: BookOpen }] as const).map(({ value, label, icon: Icon }) => (
              <button key={value} aria-pressed={mode === value} className={"btn " + (mode === value ? "btn-primary" : "btn-ghost")} onClick={() => { stopSpeaking(); setMode(value); }}><Icon size={16} /> {label}</button>
            ))}
          </div>}
        </div>
        {searching || mode === "list" ? (
          <div className="card divide-y divide-slate-100">
            {displayed.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Không tìm thấy cụm từ phù hợp.</p>}
            {displayed.map(phrase => (
              <div key={phrase.id} className="flex items-start gap-3 p-4 sm:items-center">
                <AudioButton english={phrase.english} />
                <div className="min-w-0 flex-1"><p lang="en" className="break-words font-bold">{phrase.english}</p><p className="mt-1 text-sm text-slate-600">{phrase.vietnamese}</p>{searching && <p className="mt-1 text-xs text-slate-400">{KIND_LABELS[phrase.kind]}</p>}</div>
                <LearnButton active={learned.has(phrase.id)} toggle={() => toggleLearned(phrase.id)} />
              </div>
            ))}
          </div>
        ) : <LessonPractice key={lessonNumber + "-" + mode} mode={mode} phrases={lesson.phrases} pool={phrases.filter(phrase => phrase.kind === lesson.kind)} learned={learned} toggleLearned={toggleLearned} />}
        {searching && results.length > pageSize && <div className="mt-4 flex items-center justify-center gap-3">
          <button className="btn btn-outline" disabled={searchPage === 0} onClick={() => setSearchPage(searchPage - 1)} aria-label="Trang trước"><ArrowLeft size={16} /></button>
          <span className="text-sm">{searchPage + 1}/{Math.ceil(results.length / pageSize)}</span>
          <button className="btn btn-outline" disabled={(searchPage + 1) * pageSize >= results.length} onClick={() => setSearchPage(searchPage + 1)} aria-label="Trang sau"><ArrowRight size={16} /></button>
        </div>}
      </section>
      <p className="text-xs leading-relaxed text-slate-500">Bộ cụm từ được tuyển chọn và biên tập từ hai tài liệu tham khảo về tiếng Anh thông dụng và cụm động từ, kết hợp với các kết hợp từ thường gặp.</p>
    </div>
  );
}

function AudioButton({ english }: { english: string }) {
  const [unavailable, setUnavailable] = useState(false);
  return <div className="shrink-0 text-center">
    <button type="button" aria-label={"Phát âm " + english} className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100" onClick={() => {
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) setUnavailable(true);
      else speak(english, 0.9);
    }}><Volume2 size={19} /></button>
    {unavailable && <span role="status" className="block max-w-20 text-xs text-slate-500">Không hỗ trợ âm thanh</span>}
  </div>;
}

function LearnButton({ active, toggle }: { active: boolean; toggle: () => void }) {
  return <button type="button" className={"chip shrink-0 " + (active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "")} aria-pressed={active} onClick={toggle}>
    {active && <Check size={14} />} {active ? "Đã thuộc" : "Đánh dấu"}
  </button>;
}

function LessonPractice({ mode, phrases, pool, learned, toggleLearned }: {
  mode: "flashcard" | "quiz"; phrases: Phrase[]; pool: Phrase[]; learned: Set<string>; toggleLearned: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const phrase = phrases[index];
  const finished = mode === "quiz" && index === phrases.length;
  function go(next: number) {
    stopSpeaking();
    setIndex(next);
    setFlipped(false);
    setAnswer(null);
  }
  if (finished) return <div className="card space-y-4 p-8 text-center">
    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
    <h3 className="text-xl font-extrabold">Hoàn thành bài luyện tập!</h3>
    <p className="text-slate-600">Bạn trả lời đúng {score}/{phrases.length} câu.</p>
    <button className="btn btn-primary" onClick={() => { setScore(0); go(0); }}><RotateCcw size={16} /> Luyện lại</button>
  </div>;

  return <div className="card space-y-5 p-5 sm:p-8">
    <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>{mode === "quiz" ? "Câu" : "Thẻ"} {index + 1}/{phrases.length}</span>
      {mode === "quiz" && <span>Đúng: {score}</span>}
      <AudioButton english={phrase.english} />
    </div>
    {mode === "flashcard" ? <>
      <button className="flex min-h-52 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-6 text-center" onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Lật về mặt tiếng Anh" : "Lật thẻ xem nghĩa"}>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">{flipped ? "Nghĩa tiếng Việt" : "Tiếng Anh"}</span>
        <span lang={flipped ? "vi" : "en"} className="text-2xl font-extrabold sm:text-3xl">{flipped ? phrase.vietnamese : phrase.english}</span>
        <span className="text-sm text-slate-500">Nhấn để lật thẻ</span>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn btn-outline" disabled={index === 0} onClick={() => go(index - 1)}><ArrowLeft size={16} /> Trước</button>
        <LearnButton active={learned.has(phrase.id)} toggle={() => toggleLearned(phrase.id)} />
        <button className="btn btn-outline" disabled={index === phrases.length - 1} onClick={() => go(index + 1)}>Sau <ArrowRight size={16} /></button>
      </div>
    </> : <>
      <div><p className="text-sm text-slate-500">Chọn nghĩa tiếng Việt phù hợp</p><h3 lang="en" className="mt-2 text-2xl font-extrabold">{phrase.english}</h3></div>
      <div className="grid gap-3">
        {quizOptions(phrase, pool).map((option, position) => <button key={option} disabled={answer !== null} className={"rounded-xl border p-4 text-left text-sm font-medium disabled:cursor-default " + (answer !== null && option === phrase.vietnamese ? "border-emerald-400 bg-emerald-50 text-emerald-800" : answer === option ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 hover:bg-slate-50")} onClick={() => {
          if (answer !== null) return;
          setAnswer(option);
          if (option === phrase.vietnamese) setScore(value => value + 1);
        }}>{String.fromCharCode(65 + position)}. {option}</button>)}
      </div>
      {answer !== null && <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className={answer === phrase.vietnamese ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-red-700"}>{answer === phrase.vietnamese ? "Chính xác!" : "Đáp án: " + phrase.vietnamese}</p>
        <button className="btn btn-primary" onClick={() => go(index + 1)}>{index === phrases.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} <ArrowRight size={16} /></button>
      </div>}
    </>}
  </div>;
}
