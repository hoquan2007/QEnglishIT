import { notFound } from "next/navigation";
import { Headphones, BookOpenText } from "lucide-react";
import { getTests } from "@/lib/queries";
import { TestGrid } from "@/components/tests/TestGrid";
import { PageHero } from "@/components/PageHero";

export const revalidate = 300;
export async function generateStaticParams() { return []; }
import { getToeicParts, PARTS } from "@/lib/toeic";

const TIPS: Record<number, string[]> = {
  1: ["Quan sát hình trước khi nghe: người, hành động, vật, vị trí.", "Cẩn thận bẫy âm giống nhau và động từ bị động 'is being'."],
  2: ["Tập trung vào từ để hỏi đầu câu (Who/When/Where/Why/How).", "Câu trả lời gián tiếp ('Let me check…') thường là đáp án đúng."],
  3: ["Đọc trước 3 câu hỏi trong lúc nghe phần giới thiệu.", "Đáp án thường được paraphrase, không lặp lại nguyên văn."],
  4: ["Xác định loại bài nói: thông báo, quảng cáo, tin nhắn thoại...", "Câu hỏi 'Look at the graphic' cần đối chiếu thông tin bảng."],
  5: ["Nhìn 4 đáp án trước để xác định dạng câu: từ loại, thì, giới từ, từ vựng.", "Câu từ loại có thể làm trong 5–10 giây."],
  6: ["Đọc cả đoạn để chọn liên từ và thì phù hợp ngữ cảnh.", "Câu chèn câu: dựa vào đại từ và từ nối ở câu trước/sau."],
  7: ["Đọc câu hỏi trước, xác định từ khoá rồi scan đoạn văn.", "Đoạn kép/ba: câu hỏi cuối thường cần kết hợp thông tin 2 đoạn."],
};

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  return { title: `Luyện Part ${n} TOEIC` };
}

export default async function Page({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  const meta = PARTS[n - 1];
  if (!meta) notFound();
  const tests = await getTests();
  return (
    <>
      <PageHero
        badge={`Luyện chuyên sâu · ${meta.skill}`}
        icon={n <= 4 ? <Headphones className="h-3.5 w-3.5" /> : <BookOpenText className="h-3.5 w-3.5" />}
        title={<>{meta.name}: <span className="text-brand-500">{meta.title}</span></>}
        desc={`${meta.count} câu mỗi đề (câu ${meta.range[0]}–${meta.range[1]}). Chọn đề bên dưới để luyện riêng ${meta.name} ở chế độ Luyện tập (xem giải thích ngay) hoặc Thi thử.`}
        right={
          <ul className="max-w-sm space-y-2 rounded-2xl bg-white/80 p-4 text-sm text-slate-600 ring-1 ring-brand-100">
            <li className="font-bold text-slate-800">Mẹo làm bài</li>
            {TIPS[n].map((t) => <li key={t}>• {t}</li>)}
          </ul>
        }
      />
      <TestGrid tests={tests.filter((test) => getToeicParts(test).includes(n))} fixedParts={[n]} />
    </>
  );
}
