import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Dictation } from "@/components/listening/Dictation";
import { PARTS } from "@/lib/toeic";

export const metadata = { title: "Nghe chép chính tả TOEIC" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: g } = await sb.from("question_groups").select("id, part, group_order, transcript, transcript_vi, test_id, tests(title)").eq("id", id).maybeSingle();
  if (!g || g.part > 4) notFound();
  const { data: sib } = await sb.from("question_groups").select("id").eq("part", g.part).eq("test_id", g.test_id).order("group_order");
  const idx = (sib ?? []).findIndex((s) => s.id === id);
  const next = sib?.[idx + 1]?.id;
  return (
    <>
      <Link href={`/luyen-nghe-toeic/part-${g.part}`} className="text-sm text-brand-600 hover:underline">← {PARTS[g.part - 1].name}</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{PARTS[g.part - 1].name} · Bài {idx + 1} <span className="text-base font-medium text-slate-400">{(g.tests as unknown as { title: string })?.title}</span></h1>
      <Dictation transcript={g.transcript ?? ""} transcriptVi={g.transcript_vi} keyPrefix={g.id} nextHref={next ? `/luyen-nghe-toeic/bai/${next}` : undefined} />
    </>
  );
}
