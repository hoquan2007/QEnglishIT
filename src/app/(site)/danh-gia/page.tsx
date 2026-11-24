import { Star, Quote } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";
import { ReviewForm } from "@/components/ReviewForm";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Đánh giá của học viên" };
export const revalidate = 60;

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("student_reviews").select("*").eq("is_approved", true).order("created_at", { ascending: false });
  const reviews = data ?? [];
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "–";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHero badge="Đánh giá học viên" icon={<Star className="h-3.5 w-3.5" />} title="Học viên nói gì về QEnglishIT" desc={`Điểm trung bình ${avg}/5 từ ${reviews.length} đánh giá đã duyệt.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <Quote className="h-5 w-5 text-ui-brand-icon" />
              <p className="mt-2 text-sm text-ui-body">{r.content}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">{r.display_name}</div>
                  {r.score_after && <div className="text-xs text-ui-emerald-text">{r.score_before ?? "?"} → {r.score_after} điểm</div>}
                </div>
                <div className="text-right">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-ui-unfilled"}`} />)}</div>
                  <div className="text-[11px] text-ui-faint">{formatDate(r.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
          {!reviews.length && <div className="card col-span-2 p-10 text-center text-ui-muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>}
        </div>
        <ReviewForm />
      </div>
    </div>
  );
}
