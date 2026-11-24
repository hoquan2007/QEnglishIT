import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { Dictation, type Line } from "./Dictation";

export async function ListeningLessonDetail({ slug, base, backLabel }: { slug: string; base: string; backLabel: string }) {
  const sb = supabasePublic();
  const { data: l } = await sb.from("listening_lessons").select("*").eq("slug", slug).maybeSingle();
  if (!l) notFound();
  const { data: sib } = await sb.from("listening_lessons").select("slug").eq("kind", l.kind).order("sort_order");
  const idx = (sib ?? []).findIndex((s) => s.slug === slug);
  const next = sib?.[idx + 1]?.slug;
  const lines: Line[] = (l.segments as { speaker: string; en: string; vi: string }[]).map((s) => ({ speaker: s.speaker, text: s.en, vi: s.vi }));
  return (
    <>
      <Link href={base} className="text-sm text-ui-brand-text hover:underline">← {backLabel}</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{l.title}</h1>
      <p className="text-sm text-ui-muted">{[l.level, l.topic].filter(Boolean).join(" · ")}</p>
      <Dictation lines={lines} keyPrefix={`ll:${l.id}`} audioUrl={l.audio_url} defaultMode="full" nextHref={next ? `${base}/${next}` : undefined} />
    </>
  );
}
