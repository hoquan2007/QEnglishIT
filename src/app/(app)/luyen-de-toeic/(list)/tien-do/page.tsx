import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getMyAttempts, getTests } from "@/lib/queries";
import { getUser } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { ScoreChart } from "@/components/charts/ScoreChart";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata = { title: "Tiến độ luyện đề" };

export default async function Page() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ui-secondary">Đăng nhập để lưu và xem lịch sử luyện đề của bạn.</p>
        <Link href="/login?next=/luyen-de-toeic/tien-do" className="btn btn-primary mt-4">Đăng nhập</Link>
      </div>
    );
  }
  const [attempts, tests] = await Promise.all([getMyAttempts(), getTests()]);
  const testName = new Map(tests.map((t) => [t.id, t]));
  const submitted = attempts.filter((a) => a.status === "submitted");
  const full = submitted.filter((a) => a.total_score !== null).reverse();
  const best = full.length ? Math.max(...full.map((a) => a.total_score!)) : null;
  const avg = full.length ? Math.round(full.reduce((s, a) => s + a.total_score!, 0) / full.length) : null;

  return (
    <>
      <PageHero badge="Tiến độ luyện đề" icon={<BarChart3 className="h-3.5 w-3.5" />} title="Biểu đồ điểm & lịch sử thi" desc="Theo dõi điểm số qua từng lần thi và xem lại chi tiết đáp án." />
      <div className="grid gap-4 sm:grid-cols-4">
        {[["Lượt làm bài", submitted.length], ["Đề full test", full.length], ["Điểm cao nhất", best ?? "–"], ["Điểm trung bình", avg ?? "–"]].map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-xs text-ui-muted">{l}</div><div className="text-2xl font-extrabold text-ui-brand-text">{v}</div></div>
        ))}
      </div>
      <div className="card mt-4 p-5">
        <h2 className="mb-4 font-bold">Biểu đồ điểm (L + R)</h2>
        {full.length ? (
          <ScoreChart data={full.map((a) => ({ date: formatDate(a.submitted_at!), total: a.total_score!, listening: a.score_listening ?? 0, reading: a.score_reading ?? 0 }))} />
        ) : (
          <p className="text-sm text-ui-muted">Hoàn thành một đề có cả Listening và Reading để xem biểu đồ điểm.</p>
        )}
      </div>
      <div className="card mt-4 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Lịch sử làm bài</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-ui-muted">
            <tr><th className="py-2">Ngày</th><th>Đề</th><th>Chế độ</th><th>Part</th><th>Đúng</th><th>Điểm</th><th>Thời gian</th><th /></tr>
          </thead>
          <tbody>
            {attempts.map((a) => {
              const t = testName.get(a.test_id);
              return (
                <tr key={a.id} className="border-t border-ui-divider">
                  <td className="py-2">{formatDate(a.started_at)}</td>
                  <td className="font-semibold">{t?.title}</td>
                  <td>{a.mode === "exam" ? "Thi thử" : "Luyện tập"}</td>
                  <td>{a.parts.length === 7 ? "Full" : a.parts.join(", ")}</td>
                  <td>{a.status === "submitted" ? `${a.correct_listening + a.correct_reading}` : <span className="text-ui-amber-text">Đang làm</span>}</td>
                  <td className="font-bold text-ui-brand-text">{a.total_score ?? "–"}</td>
                  <td>{formatDuration(a.time_spent_seconds)}</td>
                  <td>
                    {t && (a.status === "submitted" ? (
                      <Link className="text-ui-brand-text hover:underline" href={`/luyen-de-toeic/${t.slug}?mode=${a.mode}&parts=${a.parts.join(",")}&review=${a.id}`}>Xem lại</Link>
                    ) : (
                      <Link className="text-ui-brand-text hover:underline" href={`/luyen-de-toeic/${t.slug}?mode=${a.mode}&parts=${a.parts.join(",")}`}>Làm tiếp</Link>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!attempts.length && <p className="py-6 text-center text-sm text-ui-muted">Bạn chưa làm đề nào. <Link href="/luyen-de-toeic" className="text-ui-brand-text">Bắt đầu ngay</Link></p>}
      </div>
    </>
  );
}
