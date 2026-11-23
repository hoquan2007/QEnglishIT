import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { LoginNeeded } from "@/components/vocab/WordCollectionPage";

export const metadata = { title: "Tiến độ luyện từ" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return <LoginNeeded next="/tien-do-tu-vung" />;
  const now = new Date().toISOString();
  const [{ count: total }, { count: known }, { count: due }, { count: cart }, { data: lessons }] = await Promise.all([
    sb.from("user_vocab_progress").select("word_id", { count: "exact", head: true }),
    sb.from("user_vocab_progress").select("word_id", { count: "exact", head: true }).eq("status", "known"),
    sb.from("user_vocab_progress").select("word_id", { count: "exact", head: true }).lte("due_at", now),
    sb.from("user_vocabulary_cart").select("word_id", { count: "exact", head: true }),
    sb.from("user_progress").select("item_id, status, score").eq("item_type", "vocab_lesson"),
  ]);
  const completed = (lessons ?? []).filter((l) => l.status === "completed").length;
  const cards = [
    ["Từ đã học", total ?? 0, "text-brand-600"],
    ["Đã thuộc (≥21 ngày)", known ?? 0, "text-emerald-600"],
    ["Đến hạn ôn", due ?? 0, "text-amber-600"],
    ["Đã đánh dấu", cart ?? 0, "text-rose-600"],
    ["Bài hoàn thành", completed, "text-violet-600"],
  ] as const;
  return (
    <>
      <PageHero badge="Thống kê ghi nhớ" icon={<ChartColumn className="h-3.5 w-3.5" />} title="Tiến độ luyện từ" desc="Số liệu cập nhật theo thời gian thực từ các phiên flashcard, quiz và nghe – viết." />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([l, v, c]) => (
          <div key={l} className="card p-4"><div className="text-xs text-slate-500">{l}</div><div className={`text-3xl font-extrabold ${c}`}>{v}</div></div>
        ))}
      </div>
      <div className="card mt-4 p-6">
        <div className="text-sm text-slate-500">Tỉ lệ thuộc lâu dài</div>
        <div className="mt-2 h-4 rounded-full bg-slate-100">
          <div className="h-4 rounded-full bg-gradient-to-r from-brand-400 to-emerald-500" style={{ width: `${total ? ((known ?? 0) / total) * 100 : 0}%` }} />
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/on-tap-tu-vung" className="btn btn-primary">Ôn tập ngay ({due ?? 0})</Link>
          <Link href="/tu-vung-toeic" className="btn btn-outline">Học từ mới</Link>
        </div>
      </div>
    </>
  );
}
