import Link from "next/link";
import { notFound } from "next/navigation";
import { Headphones } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";
import { PARTS } from "@/lib/toeic";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export default async function Page({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const m = mode.match(/^part-([1-4])$/);
  if (!m) notFound();
  const part = Number(m[1]);
  const sb = supabasePublic();
  const { data: groups } = await sb
    .from("question_groups")
    .select("id, group_order, transcript, test_id, tests(title, sort_order)")
    .eq("part", part)
    .order("test_id")
    .order("group_order");
  const meta = PARTS[part - 1];
  const list = (groups ?? []).sort((a, b) => {
    const ta = (a.tests as unknown as { sort_order: number })?.sort_order ?? 0;
    const tb = (b.tests as unknown as { sort_order: number })?.sort_order ?? 0;
    return ta - tb || a.group_order - b.group_order;
  });
  return (
    <>
      <PageHero badge={`Luyện nghe ${meta.name}`} icon={<Headphones className="h-3.5 w-3.5" />} title={`${meta.name}: ${meta.title}`}
        desc={`${list.length} bài nghe từ các đề TOEIC. Mỗi bài có 4 chế độ: Điền từ, Nghe check, Nghe chép và Nghe full kèm transcript song ngữ.`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g, i) => {
          const firstLine = (g.transcript ?? "").split("\n")[0].replace(/^[A-Z0-9()]+:\s*/, "");
          return (
            <Link key={g.id} href={`/luyen-nghe-toeic/bai/${g.id}`} className="card p-4 transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-brand-600">Bài {i + 1}</span>
                <span>{(g.tests as unknown as { title: string })?.title}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-700">{firstLine}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
