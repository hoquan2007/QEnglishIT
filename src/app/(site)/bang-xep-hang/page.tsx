import { Trophy, Flame, Zap } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Bảng xếp hạng" };
export const revalidate = 120;

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.rpc("get_leaderboard");
  const rows = (data ?? []) as { id: string; display_name: string | null; xp: number; streak: number }[];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHero badge="Bảng xếp hạng" icon={<Trophy className="h-3.5 w-3.5" />} title="Top học viên chăm chỉ" desc="Xếp hạng theo tổng XP tích luỹ từ làm đề, ngữ pháp, từ vựng, nghe và đọc." />
      <div className="card divide-y divide-slate-100">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-4 px-5 py-3">
            <span className={`grid h-9 w-9 place-items-center rounded-full font-extrabold ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
            <span className="flex-1 font-semibold">{r.display_name ?? "Học viên"}</span>
            <span className="flex items-center gap-1 text-sm text-orange-500"><Flame className="h-4 w-4" />{r.streak}</span>
            <span className="flex w-24 items-center justify-end gap-1 font-bold text-brand-600"><Zap className="h-4 w-4" />{r.xp}</span>
          </div>
        ))}
        {!rows.length && <p className="p-10 text-center text-slate-500">Chưa có dữ liệu.</p>}
      </div>
    </div>
  );
}
