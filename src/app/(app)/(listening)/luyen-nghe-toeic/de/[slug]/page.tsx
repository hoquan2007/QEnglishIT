import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { PARTS } from "@/lib/toeic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: test } = await sb.from("tests").select("id, title").eq("slug", slug).maybeSingle();
  if (!test) notFound();
  const { data: groups } = await sb.from("question_groups").select("id, part, group_order").eq("test_id", test.id).lte("part", 4).order("group_order");
  return (
    <>
      <Link href="/luyen-nghe-toeic" className="text-sm text-brand-600 hover:underline">← Nghe chép chính tả</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Nghe chép · {test.title}</h1>
      {[1, 2, 3, 4].map((p) => {
        const gs = (groups ?? []).filter((g) => g.part === p);
        return (
          <section key={p} className="mt-6">
            <h2 className="mb-3 font-bold">{PARTS[p - 1].name} · {PARTS[p - 1].title}</h2>
            <div className="flex flex-wrap gap-2">
              {gs.map((g, i) => (
                <Link key={g.id} href={`/luyen-nghe-toeic/bai/${g.id}`} className="chip hover:!border-brand-300 hover:!text-brand-700">Bài {i + 1}</Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
