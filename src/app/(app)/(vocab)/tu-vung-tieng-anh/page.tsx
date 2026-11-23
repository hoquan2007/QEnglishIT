import Link from "next/link";
import { Library, ArrowRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { FAMILIES } from "@/lib/vocab";
import { PageHero } from "@/components/PageHero";
import { WordSearch } from "@/components/vocab/WordSearch";

export const metadata = { title: "Từ vựng tiếng Anh — TOEIC, IELTS, VSTEP, Giao tiếp" };
export const revalidate = 300;

const COLORS: Record<string, string> = {
  toeic: "from-sky-400 to-sky-600", "1000-50-ngay": "from-orange-400 to-orange-600", "3000": "from-indigo-400 to-indigo-600",
  ielts: "from-rose-400 to-rose-600", vstep: "from-emerald-400 to-emerald-600", "giao-tiep": "from-pink-400 to-pink-600",
};

export default async function Page() {
  const sb = await supabaseServer();
  const { data } = await sb.from("vocab_collections").select("family, vocab_lessons(count)");
  const counts = new Map<string, number>();
  (data ?? []).forEach((c) => counts.set(c.family, (counts.get(c.family) ?? 0) + ((c.vocab_lessons as unknown as { count: number }[])?.[0]?.count ?? 0)));
  const { count: words } = await sb.from("vocab_words").select("id", { count: "exact", head: true });

  return (
    <>
      <PageHero badge="Từ vựng tiếng Anh" icon={<Library className="h-3.5 w-3.5" />} title={<>Khám phá thế giới <span className="text-brand-500">từ vựng</span></>}
        desc={`${words ?? 0}+ từ vựng và cụm từ có phiên âm, nghĩa tiếng Việt, ví dụ song ngữ, phát âm và flashcard lặp lại ngắt quãng.`} />
      <WordSearch />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(FAMILIES).map(([key, f]) => (
          <Link key={key} href={f.route} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className={`bg-gradient-to-br ${COLORS[key]} p-5 text-white`}>
              <div className="text-xs font-bold uppercase tracking-widest opacity-80">{f.badge}</div>
              <div className="mt-1 text-xl font-extrabold">{f.title} {f.highlight}</div>
            </div>
            <div className="flex items-center gap-2 p-5">
              <p className="flex-1 text-sm text-slate-600">{f.desc}</p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
              <span className="text-slate-500">{counts.get(key) ?? 0} bài học</span>
              <span className="flex items-center gap-1 font-semibold text-brand-600">Học ngay <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
