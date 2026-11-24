import { MessagesSquare } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { PhraseStudy } from "@/components/phrases/PhraseStudy";
import phrases from "@/data/common-phrases.json";
import type { Phrase } from "@/lib/common-phrases";

export const metadata = {
  title: "1000 cụm tiếng Anh thông dụng",
  description: "Học 1000 cụm tiếng Anh giao tiếp, cụm động từ và kết hợp từ với 50 bài học, phát âm, flashcard và luyện tập.",
};

export default function Page() {
  return (
    <>
      <PageHero badge="Học theo cụm" icon={<MessagesSquare className="h-3.5 w-3.5" />}
        title={<>1000 cụm tiếng Anh <span className="text-brand-500">thông dụng</span></>}
        desc="50 bài học, mỗi bài 20 cụm. Học cách diễn đạt tự nhiên trong giao tiếp hằng ngày, ghi nhớ bằng flashcard và luyện chọn nghĩa." />
      <PhraseStudy phrases={phrases as Phrase[]} />
    </>
  );
}
