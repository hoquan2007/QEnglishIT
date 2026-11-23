import Link from "next/link";
import { BookOpen, Library, LineChart, Heart } from "lucide-react";
import { FAMILIES, getFamily } from "@/lib/vocab";
import { PageHero } from "@/components/PageHero";
import { FamilyTabs } from "./FamilyTabs";
import { supabaseServer } from "@/lib/supabase/server";

export async function FamilyPage({ family }: { family: string }) {
  const meta = FAMILIES[family];
  const collections = await getFamily(family);
  const totalWords = collections.reduce(
    (s, c) => s + c.vocab_lessons.reduce((x, l) => x + ((l.vocab_lesson_words as unknown as { count: number }[])?.[0]?.count ?? 0), 0),
    0,
  );
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  let done: string[] = [];
  if (u.user) {
    const { data } = await sb.from("user_progress").select("item_id").eq("item_type", "vocab_lesson").eq("status", "completed");
    done = (data ?? []).map((d) => d.item_id);
  }

  return (
    <>
      <PageHero
        badge={meta.badge}
        icon={<BookOpen className="h-3.5 w-3.5" />}
        title={<>{meta.title} <span className="text-brand-500">{meta.highlight}</span></>}
        desc={meta.desc}
        right={
          <div className="grid grid-cols-2 gap-2 md:w-80">
            {[[Library, `${totalWords}+`, "Từ vựng"], [BookOpen, `${collections.reduce((s, c) => s + c.vocab_lessons.length, 0)}`, "Bài học"], [LineChart, "SRS", "Ghi nhớ lâu hơn"], [Heart, "Miễn phí", "Học mọi lúc"]].map(([I, v, l]) => {
              const Icon = I as typeof Library;
              return (
                <div key={l as string} className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
                  <Icon className="h-5 w-5 text-brand-500" />
                  <div><div className="text-sm font-bold">{v as string}</div><div className="text-[11px] text-slate-500">{l as string}</div></div>
                </div>
              );
            })}
          </div>
        }
      />
      {collections.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Bộ từ vựng đang được cập nhật.</div>
      ) : (
        <FamilyTabs
          collections={collections.map((c) => ({
            slug: c.slug,
            title: c.title,
            lessons: c.vocab_lessons.map((l) => ({
              id: l.id, slug: l.slug, title: l.title, title_vi: l.title_vi, day: l.day_number,
              count: (l.vocab_lesson_words as unknown as { count: number }[])?.[0]?.count ?? 0,
              done: done.includes(l.id),
            })),
          }))}
        />
      )}
      <p className="mt-8 text-center text-sm text-slate-500">
        Mẹo: đánh dấu <Heart className="inline h-3.5 w-3.5 text-rose-500" /> những từ khó để ôn lại trong <Link href="/vocabulary-cart" className="text-brand-600 underline">Giỏ từ vựng</Link>.
      </p>
    </>
  );
}
