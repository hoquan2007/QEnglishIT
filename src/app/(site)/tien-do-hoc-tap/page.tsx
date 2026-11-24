import Link from "next/link";
import { Flame, Zap, Trophy, Target, BookOpen, Headphones, Library, FileText } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { ActivityBars, ScoreChart } from "@/components/charts/ScoreChart";
import { formatDate } from "@/lib/utils";
import { PARTS } from "@/lib/toeic";

export const metadata = { title: "Tiến độ học tập" };
export const dynamic = "force-dynamic";

function dayWindow(n: number) {
  const now = Date.now();
  return {
    since: new Date(now - (n - 1) * 86400000).toISOString(),
    days: Array.from({ length: n }, (_, i) => new Date(now - (n - 1 - i) * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })),
  };
}

const ACT_LABEL: Record<string, string> = { test: "Luyện đề", grammar: "Ngữ pháp", vocab: "Từ vựng", listening: "Nghe", reading: "Đọc", speaking: "Nói", writing: "Viết", course: "Khóa học" };

export default async function Page() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  const uid = u.user!.id;
  const win = dayWindow(84);
  const since = win.since;
  const [{ data: profile }, { data: sessions }, { data: attempts }, { count: words }, { data: grammar }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", uid).single(),
    sb.from("study_sessions").select("activity, correct, total, xp, created_at").gte("created_at", since).order("created_at"),
    sb.from("test_attempts").select("id, total_score, score_listening, score_reading, submitted_at, answers, test_id, parts").eq("status", "submitted").order("submitted_at"),
    sb.from("user_vocab_progress").select("word_id", { count: "exact", head: true }),
    sb.from("user_progress").select("item_id").eq("item_type", "grammar_topic").eq("status", "completed"),
  ]);

  // Heatmap: last 12 weeks
  const byDay = new Map<string, number>();
  (sessions ?? []).forEach((s) => {
    const d = new Date(s.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    byDay.set(d, (byDay.get(d) ?? 0) + s.xp);
  });
  const days = win.days.map((d) => ({ d, xp: byDay.get(d) ?? 0 }));
  const last14 = days.slice(-14).map((x) => ({ day: x.d.slice(5), xp: x.xp }));

  // Accuracy by activity
  const acc = new Map<string, { c: number; n: number }>();
  (sessions ?? []).forEach((s) => {
    const a = acc.get(s.activity) ?? { c: 0, n: 0 };
    a.c += s.correct ?? 0;
    a.n += s.total ?? 0;
    acc.set(s.activity, a);
  });

  // Part accuracy across submitted attempts
  const qIds = new Set<string>();
  (attempts ?? []).forEach((a) => Object.keys(a.answers ?? {}).forEach((k) => qIds.add(k)));
  const partAcc = new Map<number, { c: number; n: number }>();
  if (qIds.size) {
    const ids = [...qIds].slice(0, 1000);
    const { data: qs } = await sb.from("questions").select("id, part, correct_answer").in("id", ids);
    const qmap = new Map((qs ?? []).map((q) => [q.id, q]));
    (attempts ?? []).forEach((a) =>
      Object.entries(a.answers ?? {}).forEach(([qid, ans]) => {
        const q = qmap.get(qid);
        if (!q) return;
        const s = partAcc.get(q.part) ?? { c: 0, n: 0 };
        s.n++;
        if (ans === q.correct_answer) s.c++;
        partAcc.set(q.part, s);
      }),
    );
  }

  const full = (attempts ?? []).filter((a) => a.total_score !== null);
  const latest = full.at(-1)?.total_score;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Xin chào, {profile?.display_name ?? "bạn"} 👋</h1>
          <p className="text-ui-muted">Mục tiêu TOEIC {profile?.target_score ?? 650} · Thành viên từ {profile && formatDate(profile.created_at)}</p>
        </div>
        <Link href="/account-profile" className="btn btn-outline">Chỉnh mục tiêu</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Flame className="h-6 w-6 text-ui-orange-bright" />} label="Chuỗi ngày học" value={`${profile?.streak ?? 0} ngày`} sub={`Kỷ lục ${profile?.longest_streak ?? 0}`} />
        <Kpi icon={<Zap className="h-6 w-6 text-ui-amber-bright" />} label="Tổng XP" value={String(profile?.xp ?? 0)} sub="Tích luỹ từ mọi hoạt động" />
        <Kpi icon={<Trophy className="h-6 w-6 text-ui-brand-bright" />} label="Điểm gần nhất" value={latest ? `${latest}` : "–"} sub={`${full.length} đề full test`} />
        <Kpi icon={<Target className="h-6 w-6 text-ui-emerald-bright" />} label="Từ vựng & ngữ pháp" value={`${words ?? 0} từ`} sub={`${grammar?.length ?? 0} chủ điểm hoàn thành`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="font-bold">Hoạt động 12 tuần</h2>
          <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
            {days.map((x) => (
              <div key={x.d} title={`${x.d}: ${x.xp} XP`}
                className={`h-3.5 w-3.5 rounded-sm ${x.xp === 0 ? "bg-ui-subtle" : x.xp < 10 ? "bg-ui-brand-line" : x.xp < 40 ? "bg-brand-400" : "bg-brand-600"}`} />
            ))}
          </div>
          <h3 className="mt-6 text-sm font-semibold text-ui-muted">XP 14 ngày gần nhất</h3>
          <ActivityBars data={last14} />
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Điểm mạnh / yếu theo Part</h2>
          <div className="mt-4 space-y-3">
            {PARTS.map((p) => {
              const s = partAcc.get(p.part);
              const pct = s?.n ? Math.round((s.c / s.n) * 100) : null;
              return (
                <div key={p.part} className="grid grid-cols-[70px_1fr_48px] items-center gap-2 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <div className="h-2.5 rounded-full bg-ui-subtle">
                    {pct !== null && <div className={`h-2.5 rounded-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${pct}%` }} />}
                  </div>
                  <span className="text-right text-ui-muted">{pct !== null ? `${pct}%` : "–"}</span>
                </div>
              );
            })}
          </div>
          <h2 className="mt-6 font-bold">Độ chính xác theo kỹ năng</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[...acc.entries()].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-ui-canvas px-3 py-2">
                <div className="text-xs text-ui-muted">{ACT_LABEL[k] ?? k}</div>
                <div className="font-bold">{v.n ? Math.round((v.c / v.n) * 100) : 0}% <span className="text-xs font-normal text-ui-faint">({v.c}/{v.n})</span></div>
              </div>
            ))}
            {!acc.size && <p className="col-span-2 text-ui-muted">Chưa có dữ liệu. Hãy bắt đầu một bài học!</p>}
          </div>
        </div>
      </div>

      {full.length > 0 && (
        <div className="card mt-4 p-5">
          <h2 className="mb-3 font-bold">Tiến bộ điểm TOEIC</h2>
          <ScoreChart data={full.map((a) => ({ date: formatDate(a.submitted_at!), total: a.total_score!, listening: a.score_listening ?? 0, reading: a.score_reading ?? 0 }))} />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[[FileText, "Luyện đề", "/luyen-de-toeic"], [BookOpen, "Ngữ pháp", "/ngu-phap-toeic"], [Headphones, "Nghe chép", "/luyen-nghe-toeic"], [Library, "Ôn từ vựng", "/on-tap-tu-vung"]].map(([I, l, h]) => {
          const Icon = I as typeof FileText;
          return (
            <Link key={h as string} href={h as string} className="card flex items-center gap-3 p-4 hover:shadow-lg">
              <Icon className="h-5 w-5 text-ui-brand-bright" /><span className="font-semibold">{l as string}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-ui-muted">{icon}{label}</div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
      <div className="text-xs text-ui-faint">{sub}</div>
    </div>
  );
}
