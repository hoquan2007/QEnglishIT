import { FileStack } from "lucide-react";
import { getMyAttempts, getTests } from "@/lib/queries";
import { TestGrid } from "@/components/tests/TestGrid";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Luyện Đề TOEIC Online Miễn Phí — 200 Câu Sát Đề Thật" };

export default async function Page() {
  const [tests, attempts] = await Promise.all([getTests(), getMyAttempts()]);
  return (
    <>
      <PageHero
        badge="Luyện đề TOEIC online"
        icon={<FileStack className="h-3.5 w-3.5" />}
        title={<>Luyện đề TOEIC <span className="text-brand-500">miễn phí</span></>}
        desc={`${tests.length} đề full test sát đề thật, 2 chế độ Thi thử & Luyện tập — chấm điểm tự động thang 990, giải thích chi tiết từng câu và phân tích theo từng Part.`}
      />
      <TestGrid tests={tests} attempts={attempts} />
    </>
  );
}
