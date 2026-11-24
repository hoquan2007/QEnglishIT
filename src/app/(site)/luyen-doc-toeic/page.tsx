import Link from "next/link";
import { FileText, BookOpenText } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Luyện đọc TOEIC — Part 5, 6, 7 & đọc song ngữ" };
export const revalidate = 300;

const TYPE_LABEL: Record<string, string> = { email: "Email", article: "Bài báo", notice: "Thông báo", ad: "Quảng cáo", chat: "Tin nhắn", form: "Biểu mẫu", letter: "Thư", memo: "Bản ghi nhớ" };

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("reading_passages").select("slug, title, level, passage_type, questions").order("sort_order");
  const levels = [...new Set((data ?? []).map((p) => p.level))].sort();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero badge="Luyện đọc TOEIC" icon={<FileText className="h-3.5 w-3.5" />} title={<>Luyện đọc <span className="text-ui-brand-bright">song ngữ</span> Part 7</>}
        desc="Đọc từng đoạn Anh – Việt, trả lời câu hỏi có giải thích, học từ vựng then chốt. Kết hợp luyện Part 5, 6, 7 theo đề." />
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[5, 6, 7].map((p) => (
          <Link key={p} href={`/luyen-part-${p}-toeic`} className="reveal card lift flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ui-emerald-tint text-ui-emerald-text"><BookOpenText className="h-5 w-5" /></span>
            <div><div className="font-bold">Luyện Part {p}</div><div className="text-xs text-ui-muted">{p === 5 ? "Hoàn thành câu" : p === 6 ? "Hoàn thành đoạn văn" : "Đọc hiểu"} · theo đề</div></div>
          </Link>
        ))}
      </div>
      {levels.map((lv) => (
        <section key={lv} className="mb-8">
          <h2 className="mb-3 text-lg font-extrabold">Mục tiêu TOEIC {lv}+</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).filter((p) => p.level === lv).map((p) => (
              <Link key={p.slug} href={`/luyen-doc-song-ngu/${p.slug}`} className="reveal card lift p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="chip !py-0.5">{TYPE_LABEL[p.passage_type ?? ""] ?? p.passage_type}</span>
                  <span className="ml-auto text-ui-muted">{(p.questions as unknown[]).length} câu hỏi</span>
                </div>
                <div className="mt-2 font-bold">{p.title}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
