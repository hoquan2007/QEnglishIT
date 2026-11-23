import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WritingTask } from "@/components/practice/WritingTask";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const sb = await supabaseServer();
  const { data: t } = await sb.from("writing_tasks").select("*").eq("slug", (await params).slug).maybeSingle();
  if (!t) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/luyen-viet-toeic" className="text-sm text-brand-600 hover:underline">← Luyện viết TOEIC</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{t.title}</h1>
      <WritingTask task={t} />
    </div>
  );
}
