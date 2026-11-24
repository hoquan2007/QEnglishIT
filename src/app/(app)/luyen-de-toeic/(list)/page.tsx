import { FileStack } from "lucide-react";
import { getTests } from "@/lib/queries";
import { TestGrid } from "@/components/tests/TestGrid";
import { PageHero } from "@/components/PageHero";

export const revalidate = 300;

export const metadata = { title: "Luyện Đề TOEIC Online Miễn Phí — 200 Câu Sát Đề Thật" };

export default async function Page() {
  const tests = await getTests();
  return (
    <>
      <PageHero
        badge="Luyện đề TOEIC online"
        icon={<FileStack className="h-3.5 w-3.5" />}
        title={<>Luyện đề TOEIC <span className="text-brand-500">miễn phí</span></>}
        desc={`${tests.length} đề luyện tập với hai chế độ Thi thử và Luyện tập. Xem đáp án và giải thích chi tiết từng câu.`}
      />
      <TestGrid tests={tests} />
    </>
  );
}
