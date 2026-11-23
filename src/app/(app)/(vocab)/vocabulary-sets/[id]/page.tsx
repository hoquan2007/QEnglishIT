import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WordCollectionView } from "@/components/vocab/WordCollectionPage";
import type { VocabWord } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: set } = await sb.from("vocabulary_sets").select("id, title, description").eq("id", id).maybeSingle();
  if (!set) notFound();
  const { data } = await sb.from("vocabulary_set_items").select("vocab_words(*)").eq("set_id", id).order("added_at");
  const words = (data ?? []).map((r) => r.vocab_words as unknown as VocabWord).filter(Boolean);
  return (
    <>
      <Link href="/vocabulary-sets" className="text-sm text-brand-600 hover:underline">← Bộ từ vựng của tôi</Link>
      <h1 className="mb-1 mt-2 text-2xl font-extrabold">{set.title}</h1>
      <p className="mb-5 text-sm text-slate-500">{set.description ?? `${words.length} từ`}</p>
      <WordCollectionView words={words} empty="Bộ từ trống. Thêm từ từ các bài học bằng nút thư mục." />
    </>
  );
}
