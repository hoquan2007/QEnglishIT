import Link from "next/link";
import { Newspaper, Eye } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Blog TOEIC — Chiến lược, kinh nghiệm, ngữ pháp" };
export const revalidate = 300;

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const sb = supabasePublic();
  const { data } = await sb.from("blog_posts").select("slug, title, excerpt, category, tags, views, published_at").order("published_at", { ascending: false });
  const cats = [...new Set((data ?? []).map((p) => p.category))];
  const posts = (data ?? []).filter((p) => !cat || p.category === cat);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero badge="Blog TOEIC" icon={<Newspaper className="h-3.5 w-3.5" />} title={<>Blog <span className="text-brand-500">QEnglishIT</span></>} desc="Chiến lược làm bài, kinh nghiệm luyện thi và mẹo học từ vựng – ngữ pháp TOEIC." />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/blog" className="chip" data-active={!cat}>Tất cả</Link>
        {cats.map((c) => <Link key={c} href={`/blog?cat=${encodeURIComponent(c)}`} className="chip" data-active={cat === c}>{c}</Link>)}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="reveal card lift group flex flex-col p-6">
            <span className="chip w-fit !py-0.5 text-xs">{p.category}</span>
            <h2 className="mt-3 text-lg font-bold leading-snug group-hover:text-brand-700">{p.title}</h2>
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{p.excerpt}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{p.published_at && formatDate(p.published_at)}</span>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{p.views}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
