import Link from "next/link";
import { PenLine, Image as ImageIcon, MessageCircle, Users, Mic, ArrowRight } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";
import { DictationTabs } from "@/components/listening/DictationTabs";
import { DictationProgress } from "@/components/listening/DictationProgress";

export const revalidate = 300;

export const metadata = { title: "Luyện nghe TOEIC: Part 1, 2, 3, 4 & Nghe chép chính tả" };

const PART_CARDS = [
  { p: 1, title: "Part 1: Hình ảnh", icon: ImageIcon, color: "from-sky-400 to-sky-600 dark:bg-ui-sky-soft dark:text-ui-sky-strong" },
  { p: 2, title: "Part 2: Hỏi – Đáp", icon: MessageCircle, color: "from-blue-400 to-blue-600 dark:bg-ui-blue-soft dark:text-ui-blue-text" },
  { p: 3, title: "Part 3: Hội thoại", icon: Users, color: "from-indigo-400 to-indigo-600 dark:bg-ui-indigo-soft dark:text-ui-indigo-text" },
  { p: 4, title: "Part 4: Độc thoại", icon: Mic, color: "from-violet-400 to-violet-600 dark:bg-ui-violet-soft dark:text-ui-violet-text" },
];

export default async function Page() {
  const sb = supabasePublic();
  const [{ data: groups }, { data: tests }] = await Promise.all([
    sb.from("question_groups").select("id, part, test_id").lte("part", 4),
    sb.from("tests").select("id, slug, title").order("sort_order"),
  ]);
  const byPart = (p: number) => (groups ?? []).filter((g) => g.part === p).length;
  return (
    <>
      <PageHero
        badge="Tính năng luyện chuyên sâu"
        icon={<PenLine className="h-3.5 w-3.5" />}
        title="Nghe chép chính tả"
        desc="Luyện nghe chép từng câu để cải thiện khả năng nghe chi tiết, phát âm và chính tả với hàng nghìn câu từ hệ thống đề thi TOEIC của QEnglishIT. 4 chế độ: Điền từ · Nghe check · Nghe chép · Nghe full."
        right={<div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg dark:bg-ui-emerald-soft dark:bg-none dark:text-ui-emerald-strong"><PenLine className="h-10 w-10" /></div>}
      />
      <DictationTabs
        byPart={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PART_CARDS.map((c) => (
              <Link key={c.p} href={`/luyen-nghe-toeic/part-${c.p}`} className="reveal card lift group overflow-hidden">
                <div className={`grid h-24 place-items-center bg-gradient-to-br ${c.color} text-white dark:bg-none`}><c.icon className="h-9 w-9" /></div>
                <div className="p-4">
                  <div className="font-bold">{c.title}</div>
                  <div className="mt-1 flex items-center justify-between text-sm text-ui-muted">{byPart(c.p)} bài nghe <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
                </div>
              </Link>
            ))}
          </div>
        }
        byTest={
          <div className="grid gap-3 sm:grid-cols-2">
            {(tests ?? []).map((t) => (
              <Link key={t.id} href={`/luyen-nghe-toeic/de/${t.slug}`} className="reveal card lift flex items-center justify-between p-4">
                <span className="font-bold">{t.title}</span>
                <span className="text-sm text-ui-muted">{(groups ?? []).filter((g) => g.test_id === t.id).length} bài nghe →</span>
              </Link>
            ))}
          </div>
        }
        progress={<DictationProgress />}
      />
    </>
  );
}
