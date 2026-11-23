import { BookOpen, Target, Gift, Sparkles } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { GrammarBrowser } from "@/components/grammar/GrammarBrowser";

export const metadata = { title: "Ngữ pháp TOEIC — Chinh phục Part 5" };
export const revalidate = 300;

export default async function Page() {
  const sb = await supabaseServer();
  const { data: topics } = await sb
    .from("grammar_topics")
    .select("id, slug, title, title_vi, level, category, difficulty, sort_order, summary")
    .eq("is_published", true)
    .order("sort_order");
  const { data: u } = await sb.auth.getUser();
  let progress: Record<string, { status: string; score: number | null }> = {};
  if (u.user) {
    const { data } = await sb.from("user_progress").select("item_id, status, score").eq("item_type", "grammar_topic");
    progress = Object.fromEntries((data ?? []).map((p) => [p.item_id, { status: p.status, score: p.score }]));
  }
  const list = topics ?? [];
  return (
    <>
      <section className="hero-bg relative overflow-hidden rounded-3xl border border-brand-100 p-8 text-center md:p-12">
        <span className="chip !border-brand-200 !bg-white/80 !text-brand-700"><Sparkles className="h-3.5 w-3.5" />Nắm chắc ngữ pháp — Ăn trọn Part 5</span>
        <h1 className="mt-4 text-3xl font-extrabold md:text-5xl">Ôn Luyện <span className="text-gradient">Ngữ Pháp TOEIC</span></h1>
        <p className="mt-3 text-slate-600">Hệ thống bài học từ cơ bản đến nâng cao: <b>Bài giảng — Ví dụ — Mẹo — Bài tập — Quiz</b></p>
        <p className="mt-2 italic text-brand-600">Bạn không học hôm nay, ngày mai bạn sẽ phải bắt đầu lại.</p>
        <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
          {[[BookOpen, `${list.length}+`, "Chủ điểm", "bg-sky-50 text-sky-600"], [Target, "Part 5", "Trọng tâm", "bg-orange-50 text-orange-600"], [Gift, "100%", "Miễn phí", "bg-emerald-50 text-emerald-600"]].map(([I, v, l, c]) => {
            const Icon = I as typeof BookOpen;
            return (
              <div key={l as string} className={`rounded-2xl p-4 ${c}`}>
                <Icon className="mx-auto h-5 w-5" />
                <div className="mt-1 text-lg font-extrabold">{v as string}</div>
                <div className="text-xs text-slate-500">{l as string}</div>
              </div>
            );
          })}
        </div>
      </section>
      <GrammarBrowser topics={list} progress={progress} />
    </>
  );
}
