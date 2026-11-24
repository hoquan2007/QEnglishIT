"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Languages, Volume2 } from "lucide-react";
import { Quiz } from "@/components/Quiz";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/types";

type Q = { q: string; options: Option[]; answer: string; explanation: string };

export function BilingualReader({
  id, paragraphs, questions, vocabulary, nextHref,
}: {
  id: string;
  paragraphs: { en: string; vi: string }[];
  questions: Q[];
  vocabulary: { word: string; meaning_vi: string }[];
  nextHref?: string;
}) {
  const [viMode, setViMode] = useState<"hidden" | "below" | "side">("below");
  const [open, setOpen] = useState<Set<number>>(new Set());

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {([["hidden", "Chỉ tiếng Anh"], ["below", "Song ngữ"], ["side", "Song song"]] as const).map(([k, l]) => (
            <button key={k} className="chip" data-active={viMode === k} onClick={() => setViMode(k)}><Languages className="h-3.5 w-3.5" />{l}</button>
          ))}
        </div>
        <div className="card divide-y divide-ui-divider">
          {paragraphs.map((p, i) => (
            <div key={i} className={cn("p-5", viMode === "side" && "grid gap-4 md:grid-cols-2")}>
              <div className="flex gap-2">
                <p className="flex-1 leading-relaxed text-ui-strong">{p.en}</p>
                <button onClick={() => speak(p.en, 0.95)} className="h-8 w-8 shrink-0 rounded-full text-ui-brand-text hover:bg-ui-brand-tint" aria-label="Nghe đoạn"><Volume2 className="mx-auto h-4 w-4" /></button>
              </div>
              {viMode === "side" && <p className="leading-relaxed text-ui-muted">{p.vi}</p>}
              {viMode === "below" && (
                open.has(i) ? (
                  <p className="mt-2 rounded-lg bg-ui-brand-tint/60 p-3 text-sm leading-relaxed text-ui-secondary" onClick={() => setOpen((s) => { const n = new Set(s); n.delete(i); return n; })}>{p.vi}</p>
                ) : (
                  <button className="mt-2 text-xs font-semibold text-ui-brand-text" onClick={() => setOpen((s) => new Set(s).add(i))}>Xem bản dịch</button>
                )
              )}
            </div>
          ))}
        </div>
        {vocabulary.length > 0 && (
          <div className="card mt-4 p-5">
            <h3 className="mb-3 font-bold">Từ vựng then chốt</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {vocabulary.map((v) => (
                <button key={v.word} onClick={() => speak(v.word)} className="flex items-center gap-2 rounded-lg bg-ui-canvas px-3 py-2 text-left text-sm hover:bg-ui-brand-tint">
                  <Volume2 className="h-3.5 w-3.5 text-ui-brand-bright" /><b>{v.word}</b><span className="text-ui-muted">{v.meaning_vi}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="lg:sticky lg:top-20 lg:self-start">
        <h3 className="mb-3 font-bold">Câu hỏi ({questions.length})</h3>
        <Quiz
          items={questions.map((q) => ({ question_text: q.q, options: q.options, correct_answer: q.answer, explanation: q.explanation }))}
          activity="reading"
          refId={id}
          progressType="reading"
        />
        {nextHref && <Link href={nextHref} className="btn btn-outline mt-4 w-full">Bài đọc tiếp theo<ChevronRight className="h-4 w-4" /></Link>}
      </div>
    </div>
  );
}
