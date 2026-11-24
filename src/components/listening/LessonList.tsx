import Link from "next/link";
import { supabasePublic } from "@/lib/supabase/public";

export async function ListeningLessonList({ kind, base }: { kind: "bilingual" | "syllabus"; base: string }) {
  const sb = supabasePublic();
  const { data } = await sb.from("listening_lessons").select("slug, title, level, topic, segments").eq("kind", kind).order("sort_order");
  const levels = [...new Set((data ?? []).map((l) => l.level ?? ""))];
  return (
    <>
      {levels.map((lv) => (
        <section key={lv} className="mb-8">
          {lv && <h2 className="mb-3 font-bold">Trình độ {lv}</h2>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).filter((l) => (l.level ?? "") === lv).map((l, i) => (
              <Link key={l.slug} href={`${base}/${l.slug}`} className="reveal card lift p-4">
                <div className="flex items-center gap-2 text-xs text-ui-muted">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ui-brand-fill text-[11px] font-bold text-white">{i + 1}</span>
                  {l.topic && <span>{l.topic}</span>}
                  <span className="ml-auto">{(l.segments as unknown[]).length} câu</span>
                </div>
                <div className="mt-2 font-bold">{l.title}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
