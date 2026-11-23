import { ListeningLessonDetail } from "@/components/listening/LessonDetail";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ListeningLessonDetail slug={(await params).slug} base="/luyen-nghe-tieng-anh" backLabel="Giáo trình nghe" />;
}
