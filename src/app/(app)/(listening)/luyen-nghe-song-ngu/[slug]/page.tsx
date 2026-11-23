import { ListeningLessonDetail } from "@/components/listening/LessonDetail";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ListeningLessonDetail slug={(await params).slug} base="/luyen-nghe-song-ngu" backLabel="Nghe song ngữ" />;
}
