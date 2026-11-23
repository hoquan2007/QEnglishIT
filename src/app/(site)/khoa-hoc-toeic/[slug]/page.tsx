import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CoursePlayer } from "@/components/CoursePlayer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const sb = await supabaseServer();
  const { data } = await sb.from("courses").select("title").eq("slug", (await params).slug).maybeSingle();
  return { title: data?.title ?? "Khóa học" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ bai?: string }> }) {
  const { slug } = await params;
  const { bai } = await searchParams;
  const sb = await supabaseServer();
  const { data: c } = await sb.from("courses").select("id, slug, title, description, course_lessons(*)").eq("slug", slug).maybeSingle();
  if (!c) notFound();
  const lessons = [...(c.course_lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const { data: u } = await sb.auth.getUser();
  let done: string[] = [];
  if (u.user) {
    const { data } = await sb.from("user_progress").select("item_id").eq("item_type", "course_lesson").eq("status", "completed");
    done = (data ?? []).map((d) => d.item_id);
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <CoursePlayer course={{ slug: c.slug, title: c.title, description: c.description }} lessons={lessons} current={bai ?? lessons[0]?.slug} done={done} />
    </div>
  );
}
