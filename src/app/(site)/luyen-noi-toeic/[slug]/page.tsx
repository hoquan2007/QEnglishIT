import Link from "next/link";
import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase/public";
import { SpeakingTask } from "@/components/practice/SpeakingTask";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const sb = supabasePublic();
  const { data: t } = await sb.from("speaking_tasks").select("*").eq("slug", (await params).slug).maybeSingle();
  if (!t) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/luyen-noi-toeic" className="text-sm text-ui-brand-text hover:underline">← Luyện nói TOEIC</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{t.title}</h1>
      <SpeakingTask task={t} />
    </div>
  );
}
