"use client";

import { useState } from "react";
import { BookOpen, Lightbulb, ListChecks, MessageSquareQuote, Trophy, Volume2 } from "lucide-react";
import type { GrammarTopic, QuizItem } from "@/lib/types";
import { Quiz } from "@/components/Quiz";
import { cn } from "@/lib/utils";
import { speak } from "@/lib/tts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TABS = [
  { key: "lecture", label: "Bài giảng", icon: BookOpen },
  { key: "examples", label: "Ví dụ", icon: MessageSquareQuote },
  { key: "tips", label: "Mẹo", icon: Lightbulb },
  { key: "exercise", label: "Bài tập", icon: ListChecks },
  { key: "quiz", label: "Quiz", icon: Trophy },
] as const;

export function GrammarLesson({ topic, exercises, quiz }: { topic: GrammarTopic; exercises: QuizItem[]; quiz: QuizItem[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("lecture");
  return (
    <div className="mt-6">
      <div className="sticky top-16 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-ui-line bg-ui-surface/95 p-1 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold",
              tab === t.key ? "bg-ui-brand-fill text-white" : "text-ui-secondary hover:bg-ui-subtle")}
          >
            <t.icon className="h-4 w-4" />{t.label}
            {t.key === "exercise" && <span className="text-xs opacity-70">({exercises.length})</span>}
            {t.key === "quiz" && <span className="text-xs opacity-70">({quiz.length})</span>}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "lecture" && <Prose md={topic.lecture_md} />}
        {tab === "tips" && <Prose md={topic.tips_md} />}
        {tab === "examples" && (
          <div className="space-y-3">
            {topic.examples.map((e, i) => (
              <div key={i} className="card flex gap-3 p-4">
                <button onClick={() => speak(e.en)} className="h-9 w-9 shrink-0 rounded-full bg-ui-brand-tint text-ui-brand-text hover:bg-ui-brand-soft" aria-label="Nghe">
                  <Volume2 className="mx-auto h-4 w-4" />
                </button>
                <div>
                  <p className="font-medium">{e.en}</p>
                  <p className="text-sm text-ui-muted">{e.vi}</p>
                  {e.note && <p className="mt-1 text-xs text-ui-brand-strong">💡 {e.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "exercise" && <Quiz items={exercises} instant activity="grammar" refId={topic.id} />}
        {tab === "quiz" && <Quiz items={quiz} instant={false} activity="grammar" refId={topic.id} progressType="grammar_topic" />}
      </div>
    </div>
  );
}

function Prose({ md }: { md: string | null }) {
  return (
    <article className="card prose prose-slate max-w-none p-6 prose-headings:font-extrabold prose-table:text-sm prose-th:border prose-td:border prose-th:bg-ui-canvas prose-th:px-3 prose-td:px-3 md:p-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md ?? "Đang cập nhật..."}</ReactMarkdown>
    </article>
  );
}
