import Link from "next/link";
import { Mic } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Luyện nói TOEIC Speaking" };
export const revalidate = 300;

const SPEAKING_TYPES: Record<string, { label: string; q: string; desc: string }> = {
  read_aloud: { label: "Đọc to đoạn văn", q: "Câu 1–2", desc: "Đọc rõ ràng, đúng trọng âm và ngữ điệu." },
  describe_picture: { label: "Mô tả hình ảnh", q: "Câu 3–4", desc: "Mô tả chi tiết bức tranh trong 30 giây." },
  respond_questions: { label: "Trả lời câu hỏi", q: "Câu 5–7", desc: "Trả lời 3 câu hỏi về chủ đề quen thuộc." },
  respond_info: { label: "Trả lời dựa trên thông tin", q: "Câu 8–10", desc: "Dùng lịch trình/bảng biểu để trả lời." },
  express_opinion: { label: "Nêu quan điểm", q: "Câu 11", desc: "Trình bày và bảo vệ ý kiến trong 60 giây." },
};

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("speaking_tasks").select("slug, title, task_type").order("sort_order");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero badge="TOEIC Speaking" icon={<Mic className="h-3.5 w-3.5" />} title={<>Luyện nói <span className="text-ui-brand-bright">TOEIC</span></>}
        desc="Mô phỏng 11 câu Speaking: đếm giờ chuẩn bị & trả lời, ghi âm giọng nói ngay trên trình duyệt, nghe lại và so sánh với bài mẫu." />
      {Object.entries(SPEAKING_TYPES).map(([k, t]) => (
        <section key={k} className="mb-8">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-extrabold">{t.label}</h2>
            <span className="text-sm text-ui-muted">{t.q} · {t.desc}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).filter((d) => d.task_type === k).map((d, i) => (
              <Link key={d.slug} href={`/luyen-noi-toeic/${d.slug}`} className="card flex items-center gap-3 p-4 hover:shadow-lg">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ui-violet-tint text-sm font-bold text-ui-violet-text">{i + 1}</span>
                <span className="font-semibold">{d.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
