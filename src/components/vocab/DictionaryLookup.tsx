"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, Volume2 } from "lucide-react";
import {
  dictionaryQuery,
  DICTIONARY_QUERY_LIMIT,
  isDictionaryQuery,
  type DictionaryEntry,
} from "@/lib/dictionary";
import { speak } from "@/lib/tts";

type Result =
  | { state: "idle" }
  | { state: "loading"; word: string }
  | { state: "found"; entry: DictionaryEntry }
  | { state: "missing"; word: string }
  | { state: "invalid" }
  | { state: "unavailable" };

const PARTS: Record<string, string> = {
  noun: "Danh từ",
  verb: "Động từ",
  adjective: "Tính từ",
  adverb: "Trạng từ",
  pronoun: "Đại từ",
  preposition: "Giới từ",
  conjunction: "Liên từ",
  determiner: "Từ hạn định",
  interjection: "Thán từ",
  exclamation: "Thán từ",
  phrase: "Cụm từ",
};

export function DictionaryLookup() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>({ state: "idle" });
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pending.current?.abort();

    const word = dictionaryQuery(input);
    if (!isDictionaryQuery(word)) {
      setResult({ state: "invalid" });
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    setResult({ state: "loading", word });
    try {
      const response = await fetch("/api/dictionary?q=" + encodeURIComponent(word), { signal: controller.signal });
      if (response.status === 404) {
        if (!controller.signal.aborted) setResult({ state: "missing", word });
      } else if (response.ok) {
        const entry: DictionaryEntry = await response.json();
        if (!controller.signal.aborted) setResult({ state: "found", entry });
      } else if (!controller.signal.aborted) {
        setResult({ state: "unavailable" });
      }
    } catch {
      if (!controller.signal.aborted) setResult({ state: "unavailable" });
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  return (
    <>
      <form role="search" aria-label="Tra từ điển tiếng Anh" onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <label htmlFor="dictionary-word" className="sr-only">Từ hoặc cụm tiếng Anh</label>
        <input
          id="dictionary-word"
          type="search"
          lang="en"
          className="input min-w-0 flex-1 basis-44"
          placeholder="Ví dụ: resilient, look up"
          maxLength={DICTIONARY_QUERY_LIMIT}
          autoComplete="off"
          value={input}
          onChange={event => {
            setInput(event.target.value);
            if (result.state === "invalid") setResult({ state: "idle" });
          }}
          aria-invalid={result.state === "invalid" || undefined}
        />
        <button type="submit" className="btn btn-primary shrink-0">
          <Search className="h-4 w-4" aria-hidden /> Tra từ
        </button>
      </form>
      <div role="status" className={result.state === "found" ? "sr-only" : "text-sm text-slate-700 empty:hidden"}>
        {result.state === "loading" && <>Đang tra <span lang="en">{result.word}</span>…</>}
        {result.state === "missing" && <>Không tìm thấy <span lang="en">{result.word}</span>. Hãy thử cách viết khác hoặc dạng nguyên mẫu.</>}
        {result.state === "invalid" && "Hãy nhập một từ hoặc cụm tiếng Anh để tra."}
        {result.state === "unavailable" && "Từ điển đang tạm gián đoạn. Hãy thử lại sau."}
        {result.state === "found" && <>Đã tìm thấy <span lang="en">{result.entry.word}</span>.</>}
      </div>
      {result.state === "found" && <DictionaryResult entry={result.entry} />}
    </>
  );
}

function DictionaryResult({ entry }: { entry: DictionaryEntry }) {
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const recordings = entry.pronunciations.filter(item => item.audioUrl);
  const ipa = [...new Map(entry.pronunciations.filter(item => item.ipa).map(item => [item.ipa, item])).values()];

  return (
    <article aria-labelledby="dictionary-headword" className="card p-5 sm:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="dictionary-headword" lang="en" className="break-words text-3xl font-extrabold tracking-tight text-slate-900">
            {entry.word}
          </h2>
          {ipa.length > 0 && (
            <ul aria-label="Phiên âm IPA" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
              {ipa.map(item => (
                <li key={item.ipa} title={item.accent}>{item.ipa}</li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn btn-outline" onClick={() => {
          if (!window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) setVoiceUnavailable(true);
          else speak(entry.word);
        }}>
          <Volume2 size={16} aria-hidden /> Đọc từ
        </button>
      </header>
      {recordings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {recordings.map((item, index) => (
            <div key={item.audioUrl} className="max-w-full space-y-1">
              <audio controls preload="none" src={item.audioUrl} aria-label={item.accent || "Bản ghi phát âm " + (index + 1)} className="max-w-full" />
              {item.credits?.length ? <SourceLinks links={item.credits} /> : null}
            </div>
          ))}
        </div>
      )}
      {voiceUnavailable && <p className="mt-2 text-sm text-slate-600" role="status">Trình duyệt này chưa hỗ trợ đọc từ.</p>}
      {entry.meanings.map((meaning, index) => (
        <section key={meaning.partOfSpeech} aria-labelledby={"dictionary-part-" + index} className="mt-5 border-t border-slate-200 pt-4">
          <h3 id={"dictionary-part-" + index} className="font-bold text-brand-700">
            {PARTS[meaning.partOfSpeech] ?? <span lang="en">{meaning.partOfSpeech}</span>}
          </h3>
          <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-slate-800">
            {meaning.senses.map((sense, senseIndex) => (
              <li key={senseIndex} className="pl-1">
                <div lang="en" className="break-words">{sense.definition}</div>
                {sense.vietnamese.length > 0 && <p className="mt-0.5 break-words font-semibold text-brand-700">{sense.vietnamese.join(", ")}</p>}
                {sense.examples.map((example, exampleIndex) => (
                  <p key={exampleIndex} lang="en" className="mt-0.5 break-words italic text-slate-600">{example}</p>
                ))}
              </li>
            ))}
          </ol>
        </section>
      ))}
      <footer className="mt-6 border-t border-slate-200 pt-3">
        <SourceLinks links={entry.sources} />
      </footer>
    </article>
  );
}

function SourceLinks({ links }: { links: DictionaryEntry["sources"] }) {
  return (
    <ul aria-label="Nguồn từ điển" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
      {links.map(item => (
        <li key={item.url}>
          <a href={item.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{item.label}</a>
        </li>
      ))}
    </ul>
  );
}
