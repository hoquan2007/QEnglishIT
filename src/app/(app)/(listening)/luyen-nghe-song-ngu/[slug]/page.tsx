import { ListeningLessonDetail } from "@/components/listening/LessonDetail";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ListeningLessonDetail slug={(await params).slug} base="/luyen-nghe-song-ngu" backLabel="Nghe song ngữ" />;
}
