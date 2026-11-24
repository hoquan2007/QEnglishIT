import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { PARTS } from "@/lib/toeic";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = supabasePublic();
  const { data: test } = await sb.from("tests").select("id, title").eq("slug", slug).maybeSingle();
  if (!test) notFound();
  const { data: groups } = await sb.from("question_groups").select("id, part, group_order").eq("test_id", test.id).lte("part", 4).order("group_order");
  return (
    <>
      <Link href="/luyen-nghe-toeic" className="text-sm text-ui-brand-text hover:underline">← Nghe chép chính tả</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Nghe chép · {test.title}</h1>
      {[1, 2, 3, 4].map((p) => {
        const gs = (groups ?? []).filter((g) => g.part === p);
        return (
          <section key={p} className="mt-6">
            <h2 className="mb-3 font-bold">{PARTS[p - 1].name} · {PARTS[p - 1].title}</h2>
            <div className="flex flex-wrap gap-2">
              {gs.map((g, i) => (
                <Link key={g.id} href={`/luyen-nghe-toeic/bai/${g.id}`} className="chip hover:!border-ui-brand-outline hover:!text-ui-brand-strong">Bài {i + 1}</Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
