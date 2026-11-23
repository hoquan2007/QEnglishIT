import { Repeat } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { ReviewSession } from "@/components/vocab/ReviewSession";
import { LoginNeeded } from "@/components/vocab/WordCollectionPage";
import type { VocabWord } from "@/lib/types";

export const metadata = { title: "Ôn tập từ vựng hôm nay" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return <LoginNeeded next="/on-tap-tu-vung" />;
  const { data } = await sb
    .from("user_vocab_progress")
    .select("due_at, vocab_words(*)")
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(50);
  const words = (data ?? []).map((r) => r.vocab_words as unknown as VocabWord).filter(Boolean);
  return (
    <>
      <PageHero badge="Spaced Repetition" icon={<Repeat className="h-3.5 w-3.5" />} title="Ôn tập hôm nay"
        desc={`${words.length} từ đến hạn ôn. Đánh giá mức độ nhớ để hệ thống lên lịch ôn lại vào thời điểm tối ưu.`} />
      <ReviewSession words={words} />
    </>
  );
}
