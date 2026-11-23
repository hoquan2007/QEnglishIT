import { Heart } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { WordCollectionView } from "@/components/vocab/WordCollectionPage";
import type { VocabWord } from "@/lib/types";

export const metadata = { title: "Từ đã đánh dấu" };

export default async function Page() {
  const sb = await supabaseServer();
  const { data } = await sb.from("user_vocabulary_cart").select("added_at, vocab_words(*)").order("added_at", { ascending: false });
  const words = (data ?? []).map((r) => r.vocab_words as unknown as VocabWord).filter(Boolean);
  return (
    <>
      <PageHero badge="Giỏ từ vựng" icon={<Heart className="h-3.5 w-3.5" />} title="Từ đã đánh dấu" desc={`${words.length} từ bạn đã thả tim để ôn lại.`} />
      <WordCollectionView words={words} empty="Chưa có từ nào. Nhấn biểu tượng trái tim ở bất kỳ từ nào để lưu vào đây." />
    </>
  );
}
