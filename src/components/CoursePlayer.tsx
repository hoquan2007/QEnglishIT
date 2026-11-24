"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Circle, ExternalLink, FileText, Link2, PlayCircle, ListChecks, ChevronRight } from "lucide-react";
import { Markdown } from "./Markdown";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Lesson = { id: string; slug: string; title: string; lesson_type: string; content_md: string | null; link_href: string | null; video_url: string | null; duration_minutes: number | null };

const ICON = { article: FileText, link: Link2, video: PlayCircle, quiz: ListChecks } as const;

export function CoursePlayer({ course, lessons, current, done: initialDone }: { course: { slug: string; title: string; description: string | null }; lessons: Lesson[]; current: string; done: string[] }) {
  const router = useRouter();
  const [done, setDone] = useState(new Set(initialDone));
  const idx = Math.max(0, lessons.findIndex((l) => l.slug === current));
  const l = lessons[idx];
  const next = lessons[idx + 1];
  const pct = lessons.length ? Math.round((lessons.filter((x) => done.has(x.id)).length / lessons.length) * 100) : 0;

  async function complete() {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (u.user) {
      await sb.from("user_progress").upsert({ user_id: u.user.id, item_type: "course_lesson", item_id: l.id, status: "completed", score: 100, updated_at: new Date().toISOString() });
      await sb.rpc("record_study", { _activity: "course", _ref: l.id, _correct: 1, _total: 1, _xp: 3, _seconds: (l.duration_minutes ?? 0) * 60 });
    }
    setDone((s) => new Set(s).add(l.id));
    if (next) router.push(`/khoa-hoc-toeic/${course.slug}?bai=${next.slug}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="card h-fit p-4 lg:sticky lg:top-20">
        <Link href="/hoc-toeic-online" className="text-xs text-ui-brand-text hover:underline">← Tất cả khóa học</Link>
        <h1 className="mt-2 text-lg font-extrabold">{course.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-ui-muted">
          <div className="h-2 flex-1 rounded-full bg-ui-subtle"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>{pct}%
        </div>
        <ol className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto">
          {lessons.map((x, i) => {
            const Icon = ICON[x.lesson_type as keyof typeof ICON] ?? FileText;
            return (
              <li key={x.id}>
                <Link href={`/khoa-hoc-toeic/${course.slug}?bai=${x.slug}`} className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-ui-canvas", x.id === l?.id && "bg-ui-brand-tint font-semibold text-ui-brand-strong")}>
                  {done.has(x.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ui-emerald-bright" /> : <Circle className="h-4 w-4 shrink-0 text-ui-inactive" />}
                  <span className="w-5 text-xs text-ui-faint">{i + 1}</span>
                  <span className="flex-1">{x.title}</span>
                  <Icon className="h-3.5 w-3.5 text-ui-faint" />
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>
      {l ? (
        <article className="card p-6 md:p-8">
          <div className="text-xs font-bold uppercase tracking-wider text-ui-brand-text">Bài {idx + 1} · {l.duration_minutes ? `${l.duration_minutes} phút` : l.lesson_type}</div>
          <h2 className="mt-1 text-2xl font-extrabold">{l.title}</h2>
          {l.video_url && (
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe src={l.video_url} className="h-full w-full" allowFullScreen title={l.title} />
            </div>
          )}
          {l.content_md && <Markdown className="mt-4">{l.content_md}</Markdown>}
          {l.link_href && (
            <Link href={l.link_href} className="mt-5 flex items-center gap-3 rounded-2xl border border-ui-brand-line bg-ui-brand-tint p-4 hover:bg-ui-brand-soft">
              <ExternalLink className="h-5 w-5 text-ui-brand-text" />
              <div className="flex-1"><div className="font-bold text-ui-brand-deep">Mở bài luyện tập</div><div className="text-xs text-ui-brand-strong">{l.link_href}</div></div>
              <ChevronRight className="h-5 w-5 text-ui-brand-text" />
            </Link>
          )}
          <div className="mt-8 flex justify-end gap-2 border-t border-ui-divider pt-5">
            <button className="btn btn-primary" onClick={complete}>
              <CheckCircle2 className="h-4 w-4" />{done.has(l.id) ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}{next && " & học tiếp"}
            </button>
          </div>
        </article>
      ) : (
        <div className="card p-10 text-center text-ui-muted">Khóa học đang được cập nhật.</div>
      )}
    </div>
  );
}
