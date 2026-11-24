import { GraduationCap } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ListeningLessonList } from "@/components/listening/LessonList";

export const revalidate = 300;

export const metadata = { title: "Luyện nghe tiếng Anh theo giáo trình" };

export default function Page() {
  return (
    <>
      <PageHero badge="Giáo trình nghe" icon={<GraduationCap className="h-3.5 w-3.5" />} title={<>Luyện nghe tiếng Anh <span className="text-ui-brand-bright">A2 → B2</span></>}
        desc="Bài nghe đời sống được sắp xếp theo trình độ. Bắt đầu với Nghe full, sau đó luyện Điền từ và Nghe chép để nghe chi tiết." />
      <ListeningLessonList kind="syllabus" base="/luyen-nghe-tieng-anh" />
    </>
  );
}
