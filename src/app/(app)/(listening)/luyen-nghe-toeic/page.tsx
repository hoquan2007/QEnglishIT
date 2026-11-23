import Link from "next/link";
import { PenLine, Image as ImageIcon, MessageCircle, Users, Mic, ArrowRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { DictationTabs } from "@/components/listening/DictationTabs";

export const metadata = { title: "Luyện nghe TOEIC: Part 1, 2, 3, 4 & Nghe chép chính tả" };

const PART_CARDS = [
  { p: 1, title: "Part 1: Hình ảnh", icon: ImageIcon, color: "from-sky-400 to-sky-600" },
  { p: 2, title: "Part 2: Hỏi – Đáp", icon: MessageCircle, color: "from-blue-400 to-blue-600" },
  { p: 3, title: "Part 3: Hội thoại", icon: Users, color: "from-indigo-400 to-indigo-600" },
  { p: 4, title: "Part 4: Độc thoại", icon: Mic, color: "from-violet-400 to-violet-600" },
];

export default async function Page() {
  const sb = await supabaseServer();
  const [{ data: groups }, { data: tests }, { data: u }] = await Promise.all([
    sb.from("question_groups").select("id, part, test_id").lte("part", 4),
    sb.from("tests").select("id, slug, title").order("sort_order"),
    sb.auth.getUser(),
  ]);
  const byPart = (p: number) => (groups ?? []).filter((g) => g.part === p).length;
  let done = 0;
  if (u.user) {
    const { count } = await sb.from("listening_check_progress").select("item_key", { count: "exact", head: true }).eq("correct", true);
    done = count ?? 0;
  }
  return (
    <>
      <PageHero
        badge="Tính năng luyện chuyên sâu"
        icon={<PenLine className="h-3.5 w-3.5" />}
        title="Nghe chép chính tả"
        desc="Luyện nghe chép từng câu để cải thiện khả năng nghe chi tiết, phát âm và chính tả với hàng nghìn câu từ hệ thống đề thi TOEIC của QEnglishIT. 4 chế độ: Điền từ · Nghe check · Nghe chép · Nghe full."
        right={<div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg"><PenLine className="h-10 w-10" /></div>}
      />
      <DictationTabs
        byPart={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PART_CARDS.map((c) => (
              <Link key={c.p} href={`/luyen-nghe-toeic/part-${c.p}`} className="card group overflow-hidden transition hover:shadow-lg">
                <div className={`grid h-24 place-items-center bg-gradient-to-br ${c.color} text-white`}><c.icon className="h-9 w-9" /></div>
                <div className="p-4">
                  <div className="font-bold">{c.title}</div>
                  <div className="mt-1 flex items-center justify-between text-sm text-slate-500">{byPart(c.p)} bài nghe <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
                </div>
              </Link>
            ))}
          </div>
        }
        byTest={
          <div className="grid gap-3 sm:grid-cols-2">
            {(tests ?? []).map((t) => (
              <Link key={t.id} href={`/luyen-nghe-toeic/de/${t.slug}`} className="card flex items-center justify-between p-4 hover:shadow-lg">
                <span className="font-bold">{t.title}</span>
                <span className="text-sm text-slate-500">{(groups ?? []).filter((g) => g.test_id === t.id).length} bài nghe →</span>
              </Link>
            ))}
          </div>
        }
        progress={
          <div className="card p-6">
            {u.user ? (
              <>
                <div className="text-sm text-slate-500">Số câu đã nghe chép đúng</div>
                <div className="text-4xl font-extrabold text-emerald-600">{done}</div>
              </>
            ) : (
              <p className="text-slate-500"><Link href="/login?next=/luyen-nghe-toeic" className="text-brand-600 underline">Đăng nhập</Link> để lưu tiến độ nghe chép.</p>
            )}
          </div>
        }
      />
    </>
  );
}
