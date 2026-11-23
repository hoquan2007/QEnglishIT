import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Tiến độ ngữ pháp" };

export default async function Page() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-slate-600">Đăng nhập để theo dõi tiến độ học ngữ pháp.</p>
        <Link href="/login?next=/ngu-phap-toeic/tien-do" className="btn btn-primary mt-4">Đăng nhập</Link>
      </div>
    );
  }
  const [{ data: topics }, { data: prog }] = await Promise.all([
    sb.from("grammar_topics").select("id, slug, title, title_vi, level, sort_order").order("sort_order"),
    sb.from("user_progress").select("item_id, status, score, updated_at").eq("item_type", "grammar_topic"),
  ]);
  const map = new Map((prog ?? []).map((p) => [p.item_id, p]));
  const done = (prog ?? []).filter((p) => p.status === "completed").length;
  const total = topics?.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="card p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-500">Hoàn thành</div>
            <div className="text-3xl font-extrabold text-brand-600">{done}/{total} chủ điểm</div>
          </div>
          <div className="text-2xl font-bold">{pct}%</div>
        </div>
        <div className="mt-3 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="card mt-4 divide-y divide-slate-100">
        {(topics ?? []).map((t) => {
          const p = map.get(t.id);
          return (
            <Link key={t.id} href={`/ngu-phap-toeic/${t.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
              {p?.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : p ? <Clock className="h-5 w-5 text-amber-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
              <span className="flex-1"><b>{t.title}</b> <span className="text-sm text-slate-500">{t.title_vi}</span></span>
              <span className="text-xs text-slate-400">TOEIC {t.level}+</span>
              <span className="w-12 text-right text-sm font-semibold">{p ? `${p.score}%` : "–"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
