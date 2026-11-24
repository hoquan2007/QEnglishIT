import Link from "next/link";
import { Map, Flag, Target, Trophy, ArrowRight } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Lộ trình học TOEIC 450 – 650 – 800+" };
export const revalidate = 300;

const STAGES = [
  { icon: Flag, title: "Giai đoạn 1 · Nền tảng (0 → 450)", weeks: "6–8 tuần", items: [["Ngữ pháp cơ bản: thì, từ loại", "/ngu-phap-toeic"], ["3000 từ thông dụng A1–B1", "/3000-tu-vung-tieng-anh-thong-dung"], ["Part 1 & Part 2", "/luyen-part-1-toeic"], ["Nghe chép chính tả Part 1–2", "/luyen-nghe-toeic/part-1"]] },
  { icon: Target, title: "Giai đoạn 2 · Tăng tốc (450 → 650)", weeks: "8–10 tuần", items: [["1000 từ TOEIC / 50 ngày", "/1000-tu-vung-toeic-50-ngay"], ["Part 5 – Part 6 theo đề", "/luyen-part-5-toeic"], ["Part 3 – Part 4 + nghe song ngữ", "/luyen-nghe-song-ngu"], ["Đọc song ngữ Part 7", "/luyen-doc-toeic"]] },
  { icon: Trophy, title: "Giai đoạn 3 · Bứt phá (650 → 800+)", weeks: "8–12 tuần", items: [["Ngữ pháp nâng cao 700–800", "/ngu-phap-toeic"], ["Từ vựng TOEIC 800+", "/tu-vung-toeic"], ["Full test thi thử hàng tuần", "/luyen-de-toeic"], ["Phân tích điểm yếu & ôn lại", "/luyen-de-toeic/tien-do"]] },
];

export default async function Page() {
  const sb = supabasePublic();
  const { data: courses } = await sb.from("courses").select("slug, title, target_score").order("sort_order");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHero badge="Lộ trình học" icon={<Map className="h-3.5 w-3.5" />} title={<>Lộ trình chinh phục <span className="text-ui-brand-bright">TOEIC 800+</span></>}
        desc="Ba giai đoạn rõ ràng, mỗi bước liên kết tới bài học và bài luyện tương ứng. Học đều 45–60 phút mỗi ngày." />
      <div className="relative space-y-6 border-l-2 border-dashed border-ui-brand-line pl-8">
        {STAGES.map((s) => (
          <div key={s.title} className="relative">
            <span className="absolute -left-[50px] grid h-10 w-10 place-items-center rounded-full bg-ui-brand-fill text-white shadow-lg"><s.icon className="h-5 w-5" /></span>
            <div className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-extrabold">{s.title}</h2>
                <span className="chip">{s.weeks}</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {s.items.map(([label, href]) => (
                  <Link key={label} href={href} className="flex items-center justify-between rounded-xl bg-ui-canvas px-4 py-3 text-sm font-medium hover:bg-ui-brand-tint hover:text-ui-brand-strong">
                    {label}<ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mb-4 mt-12 text-2xl font-extrabold">Khóa học theo lộ trình</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(courses ?? []).map((c) => (
          <Link key={c.slug} href={`/khoa-hoc-toeic/${c.slug}`} className="card p-5 hover:shadow-lg">
            <div className="text-3xl font-extrabold text-ui-brand-text">{c.target_score ?? "★"}{c.target_score && "+"}</div>
            <div className="mt-1 font-bold">{c.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
