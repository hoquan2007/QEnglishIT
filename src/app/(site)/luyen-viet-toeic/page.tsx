import Link from "next/link";
import { PenLine } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Luyện viết TOEIC Writing" };
export const revalidate = 300;

const TYPES: Record<string, { label: string; q: string; desc: string }> = {
  sentence_picture: { label: "Viết câu theo tranh", q: "Câu 1–5", desc: "Dùng 2 từ cho sẵn để viết 1 câu mô tả bức tranh." },
  respond_email: { label: "Trả lời email", q: "Câu 6–7", desc: "Phản hồi email theo đúng yêu cầu trong 10 phút." },
  opinion_essay: { label: "Bài luận nêu quan điểm", q: "Câu 8", desc: "Viết tối thiểu 300 từ trong 30 phút." },
};

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("writing_tasks").select("slug, title, task_type").order("sort_order");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero badge="TOEIC Writing" icon={<PenLine className="h-3.5 w-3.5" />} title={<>Luyện viết <span className="text-brand-500">TOEIC</span></>}
        desc="Mô phỏng 8 câu Writing với đồng hồ đếm ngược, đếm từ, kiểm tra từ khoá bắt buộc, lưu bài làm và so sánh với bài mẫu." />
      {Object.entries(TYPES).map(([k, t]) => (
        <section key={k} className="mb-8">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-extrabold">{t.label}</h2>
            <span className="text-sm text-slate-500">{t.q} · {t.desc}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).filter((d) => d.task_type === k).map((d, i) => (
              <Link key={d.slug} href={`/luyen-viet-toeic/${d.slug}`} className="card flex items-center gap-3 p-4 hover:shadow-lg">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-50 text-sm font-bold text-sky-600">{i + 1}</span>
                <span className="font-semibold">{d.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
