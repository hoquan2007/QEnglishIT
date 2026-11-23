import { MessageSquareHeart } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata = { title: "Góp ý & chia sẻ" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHero badge="Góp ý" icon={<MessageSquareHeart className="h-3.5 w-3.5" />} title="Góp ý & chia sẻ"
        desc="Mọi ý kiến của bạn giúp QEnglishIT tốt hơn mỗi ngày: đề xuất tính năng, báo lỗi nội dung, hoặc chia sẻ câu chuyện học TOEIC của bạn. Câu trả lời sẽ được gửi vào Hộp thư." />
      <FeedbackForm />
    </div>
  );
}
