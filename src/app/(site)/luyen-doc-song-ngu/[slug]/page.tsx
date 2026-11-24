import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { BilingualReader } from "@/components/reading/BilingualReader";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const sb = supabasePublic();
  const { data } = await sb.from("reading_passages").select("title").eq("slug", (await params).slug).maybeSingle();
  return { title: data?.title ? `${data.title} — Đọc song ngữ` : "Đọc song ngữ" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = supabasePublic();
  const { data: p } = await sb.from("reading_passages").select("*").eq("slug", slug).maybeSingle();
  if (!p) notFound();
  const { data: sib } = await sb.from("reading_passages").select("slug").order("sort_order");
  const idx = (sib ?? []).findIndex((s) => s.slug === slug);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/luyen-doc-toeic" className="text-sm text-brand-600 hover:underline">← Luyện đọc TOEIC</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{p.title}</h1>
      <p className="text-sm text-slate-500">TOEIC {p.level}+ · {p.passage_type}</p>
      <BilingualReader
        id={p.id}
        paragraphs={p.paragraphs}
        questions={p.questions}
        vocabulary={p.vocabulary ?? []}
        nextHref={sib?.[idx + 1] ? `/luyen-doc-song-ngu/${sib[idx + 1].slug}` : undefined}
      />
    </div>
  );
}
