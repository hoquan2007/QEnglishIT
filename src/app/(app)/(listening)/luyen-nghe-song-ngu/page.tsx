import { Languages } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ListeningLessonList } from "@/components/listening/LessonList";

export const revalidate = 300;

export const metadata = { title: "Nghe song ngữ Anh – Việt" };

export default function Page() {
  return (
    <>
      <PageHero badge="Nghe song ngữ" icon={<Languages className="h-3.5 w-3.5" />} title={<>Nghe song ngữ <span className="text-brand-500">Anh – Việt</span></>}
        desc="Hội thoại và bài nói ngắn phong cách TOEIC, từng câu có bản dịch tiếng Việt. Bật/tắt phụ đề, nghe lại từng câu, chuyển sang chế độ nghe chép." />
      <ListeningLessonList kind="bilingual" base="/luyen-nghe-song-ngu" />
    </>
  );
}
