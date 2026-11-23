import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Markdown } from "@/components/Markdown";
import { DocActions } from "@/components/DocActions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.from("documents").select("title").eq("slug", (await params).slug).maybeSingle();
  return { title: data?.title ?? "Tài liệu" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const sb = await supabaseServer();
  const { data: d } = await sb.from("documents").select("*").eq("slug", (await params).slug).maybeSingle();
  if (!d) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/tai-lieu" className="text-sm text-brand-600 hover:underline print:hidden">← Tài liệu</Link>
      <h1 className="mt-2 text-3xl font-extrabold">{d.title}</h1>
      <p className="mt-1 text-slate-500">{d.description}</p>
      <DocActions id={d.id} slug={d.slug} title={d.title} content={d.content_md ?? ""} fileUrl={d.file_url} />
      <div className="card mt-5 p-6 md:p-10 print:border-0 print:p-0"><Markdown>{d.content_md}</Markdown></div>
      <p className="mt-6 text-center text-xs text-slate-400">© QEnglishIT — tài liệu học tập miễn phí</p>
    </div>
  );
}
