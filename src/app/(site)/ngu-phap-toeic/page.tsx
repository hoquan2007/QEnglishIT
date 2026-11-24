import { BookOpen, Target, Gift, Sparkles } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { GrammarBrowser } from "@/components/grammar/GrammarBrowser";

export const metadata = { title: "Ngữ pháp TOEIC — Chinh phục Part 5" };
export const revalidate = 300;

export default async function Page() {
  const sb = supabasePublic();
  const { data: topics } = await sb
    .from("grammar_topics")
    .select("id, slug, title, title_vi, level, category, difficulty, sort_order, summary")
    .eq("is_published", true)
    .order("sort_order");
  const list = topics ?? [];
  return (
    <>
      <section className="hero-bg relative overflow-hidden rounded-3xl border border-ui-brand-soft p-8 text-center md:p-12">
        <span className="chip !border-ui-brand-line !bg-ui-surface/80 !text-ui-brand-strong"><Sparkles className="h-3.5 w-3.5" />Nắm chắc ngữ pháp — Ăn trọn Part 5</span>
        <h1 className="mt-4 text-3xl font-extrabold md:text-5xl">Ôn Luyện <span className="text-gradient">Ngữ Pháp TOEIC</span></h1>
        <p className="mt-3 text-ui-secondary">Hệ thống bài học từ cơ bản đến nâng cao: <b>Bài giảng — Ví dụ — Mẹo — Bài tập — Quiz</b></p>
        <p className="mt-2 italic text-ui-brand-text">Bạn không học hôm nay, ngày mai bạn sẽ phải bắt đầu lại.</p>
        <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
          {[[BookOpen, `${list.length}+`, "Chủ điểm", "bg-ui-sky-tint text-ui-sky-text"], [Target, "Part 5", "Trọng tâm", "bg-ui-orange-tint text-ui-orange-text"], [Gift, "100%", "Miễn phí", "bg-ui-emerald-tint text-ui-emerald-text"]].map(([I, v, l, c]) => {
            const Icon = I as typeof BookOpen;
            return (
              <div key={l as string} className={`rounded-2xl p-4 ${c}`}>
                <Icon className="mx-auto h-5 w-5" />
                <div className="mt-1 text-lg font-extrabold">{v as string}</div>
                <div className="text-xs text-ui-muted">{l as string}</div>
              </div>
            );
          })}
        </div>
      </section>
      <GrammarBrowser topics={list} />
    </>
  );
}
