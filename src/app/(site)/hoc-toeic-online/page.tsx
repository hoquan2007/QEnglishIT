import Link from "next/link";
import { GraduationCap, ArrowRight, BookOpen } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Khóa học TOEIC online miễn phí" };
export const revalidate = 300;

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("courses").select("slug, title, description, target_score, course_lessons(count)").order("sort_order");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero badge="Khóa học miễn phí" icon={<GraduationCap className="h-3.5 w-3.5" />} title={<>Khóa học <span className="text-brand-500">TOEIC online</span></>}
        desc="Các khóa học được thiết kế theo mục tiêu điểm: bài giảng, bài tập và liên kết trực tiếp tới các phần luyện tập trên QEnglishIT." />
      <div className="grid gap-5 md:grid-cols-2">
        {(data ?? []).map((c, i) => (
          <Link key={c.slug} href={`/khoa-hoc-toeic/${c.slug}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className={`flex items-center gap-4 bg-gradient-to-br p-6 text-white ${["from-sky-500 to-cyan-600", "from-violet-500 to-indigo-600", "from-orange-500 to-rose-500", "from-emerald-500 to-teal-600"][i % 4]}`}>
              <div className="text-5xl font-extrabold opacity-90">{c.target_score ?? ""}{c.target_score ? "+" : <BookOpen className="h-10 w-10" />}</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-80">Khóa học</div>
                <div className="text-xl font-extrabold">{c.title}</div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">{c.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">{(c.course_lessons as unknown as { count: number }[])?.[0]?.count ?? 0} bài học</span>
                <span className="flex items-center gap-1 font-semibold text-brand-600">Vào học <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
