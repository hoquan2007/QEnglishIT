import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { VocabLesson } from "@/components/vocab/VocabLesson";
import type { VocabWord } from "@/lib/types";
import { FAMILIES } from "@/lib/vocab";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

async function load(collection: string, lesson: string) {
  const sb = supabasePublic();
  const { data: col } = await sb.from("vocab_collections").select("id, slug, title, family").eq("slug", collection).maybeSingle();
  if (!col) return null;
  const { data: les } = await sb
    .from("vocab_lessons")
    .select("id, slug, title, title_vi, day_number, sort_order, vocab_lesson_words(sort_order, vocab_words(*))")
    .eq("collection_id", col.id)
    .eq("slug", lesson)
    .maybeSingle();
  if (!les) return null;
  const { data: siblings } = await sb.from("vocab_lessons").select("slug, title, sort_order").eq("collection_id", col.id).order("sort_order");
  type Row = { sort_order: number; vocab_words: VocabWord };
  const words = ((les.vocab_lesson_words ?? []) as unknown as Row[]).sort((a, b) => a.sort_order - b.sort_order).map((r) => r.vocab_words);
  return { col, les, words, siblings: siblings ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ collection: string; lesson: string }> }) {
  const { collection, lesson } = await params;
  const d = await load(collection, lesson);
  return { title: d ? `${d.les.title} — ${d.col.title}` : "Từ vựng" };
}

export default async function Page({ params }: { params: Promise<{ collection: string; lesson: string }> }) {
  const { collection, lesson } = await params;
  const d = await load(collection, lesson);
  if (!d) notFound();
  const idx = d.siblings.findIndex((s) => s.slug === lesson);
  const next = d.siblings[idx + 1];
  const fam = FAMILIES[d.col.family];
  return (
    <>
      <div className="text-sm text-slate-500">
        <Link href={fam?.route ?? "/tu-vung-tieng-anh"} className="text-brand-600 hover:underline">{d.col.title}</Link> / {d.les.title}
      </div>
      <h1 className="mt-2 text-2xl font-extrabold">
        {d.les.day_number ? `Ngày ${d.les.day_number}: ` : ""}{d.les.title}
        {d.les.title_vi && <span className="ml-2 text-lg font-semibold text-slate-400">{d.les.title_vi}</span>}
      </h1>
      <p className="text-sm text-slate-500">{d.words.length} từ vựng</p>
      <VocabLesson lessonId={d.les.id} words={d.words} nextHref={next ? `/tu-vung/${collection}/${next.slug}` : undefined} />
    </>
  );
}
