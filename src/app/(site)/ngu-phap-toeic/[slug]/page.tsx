import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { GrammarLesson } from "@/components/grammar/GrammarLesson";
import type { GrammarTopic, QuizItem } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.from("grammar_topics").select("title, title_vi").eq("slug", (await params).slug).maybeSingle();
  return { title: data ? `${data.title} — ${data.title_vi ?? "Ngữ pháp TOEIC"}` : "Ngữ pháp TOEIC" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: topic } = await sb.from("grammar_topics").select("*").eq("slug", slug).maybeSingle();
  if (!topic) notFound();
  const [{ data: qs }, { data: siblings }] = await Promise.all([
    sb.from("grammar_questions").select("*").eq("topic_id", topic.id).order("kind").order("sort_order"),
    sb.from("grammar_topics").select("slug, title, sort_order").order("sort_order"),
  ]);
  const idx = (siblings ?? []).findIndex((s) => s.slug === slug);
  const prev = siblings?.[idx - 1];
  const next = siblings?.[idx + 1];
  const exercises = (qs ?? []).filter((q) => q.kind === "exercise") as QuizItem[];
  const quiz = (qs ?? []).filter((q) => q.kind === "quiz") as QuizItem[];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/ngu-phap-toeic" className="text-sm text-brand-600 hover:underline">← Tất cả chủ điểm</Link>
      <div className="mt-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip">TOEIC {topic.level}+</span>
          <span className="chip">{topic.category}</span>
          <span className="chip">{topic.difficulty}</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold">{topic.title}</h1>
        {topic.title_vi && <p className="text-lg text-slate-500">{topic.title_vi}</p>}
        {topic.summary && <p className="mt-2 text-slate-600">{topic.summary}</p>}
      </div>
      <GrammarLesson topic={topic as GrammarTopic} exercises={exercises} quiz={quiz} />
      <div className="mt-10 flex justify-between gap-3">
        {prev ? <Link href={`/ngu-phap-toeic/${prev.slug}`} className="btn btn-outline"><ChevronLeft className="h-4 w-4" />{prev.title}</Link> : <span />}
        {next && <Link href={`/ngu-phap-toeic/${next.slug}`} className="btn btn-primary">{next.title}<ChevronRight className="h-4 w-4" /></Link>}
      </div>
    </div>
  );
}
