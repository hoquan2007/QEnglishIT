import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/utils";
import { ViewPing } from "@/components/ViewPing";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const sb = supabasePublic();
  const { data } = await sb.from("blog_posts").select("title, excerpt").eq("slug", (await params).slug).maybeSingle();
  return { title: data?.title ?? "Blog", description: data?.excerpt ?? undefined };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = supabasePublic();
  const { data: p } = await sb.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  if (!p) notFound();
  const { data: more } = await sb.from("blog_posts").select("slug, title").eq("category", p.category).neq("slug", slug).limit(4);
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_280px]">
      <article>
        <ViewPing slug={slug} />
        <Link href="/blog" className="text-sm text-ui-brand-text hover:underline">← Blog</Link>
        <div className="mt-3 flex gap-2 text-xs"><span className="chip">{p.category}</span>{(p.tags ?? []).map((t: string) => <span key={t} className="chip">#{t}</span>)}</div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{p.title}</h1>
        <p className="mt-2 text-sm text-ui-faint">{p.published_at && formatDate(p.published_at)} · {p.views} lượt xem</p>
        <div className="card mt-6 p-6 md:p-10"><Markdown>{p.content_md}</Markdown></div>
      </article>
      <aside className="space-y-4 lg:pt-24">
        <div className="card p-5">
          <div className="mb-3 font-bold">Bài viết liên quan</div>
          <ul className="space-y-2 text-sm">
            {(more ?? []).map((m) => <li key={m.slug}><Link href={`/blog/${m.slug}`} className="hover:text-ui-brand-text">{m.title}</Link></li>)}
          </ul>
        </div>
        <div className="card bg-gradient-to-br from-ui-brand-fill to-sky-700 p-5 text-white">
          <div className="font-bold">Luyện đề ngay</div>
          <p className="mt-1 text-sm text-brand-50">Áp dụng chiến lược vào đề thi thử full test.</p>
          <Link href="/luyen-de-toeic" className="btn mt-3 bg-ui-surface text-ui-brand-strong">Vào luyện đề</Link>
        </div>
      </aside>
    </div>
  );
}
