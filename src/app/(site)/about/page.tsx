import Link from "next/link";
import { Heart, Target, Users, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Giới thiệu QEnglishIT" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto w-fit"><LogoMark size={64} /></div>
        <h1 className="mt-4 text-4xl font-extrabold">Về <span className="text-gradient">QEnglishIT</span></h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-ui-secondary">
          QEnglishIT là nền tảng luyện thi TOEIC miễn phí, giúp người học Việt Nam luyện đề, nghe, đọc, ngữ pháp và từ vựng với giải thích chi tiết bằng tiếng Việt.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          [Target, "Sứ mệnh", "Giúp mọi người tiếp cận tài liệu luyện thi chất lượng mà không phải trả phí."],
          [Sparkles, "Nội dung gốc", "Toàn bộ đề thi, bài học và từ vựng được đội ngũ QEnglishIT tự biên soạn theo format TOEIC mới."],
          [Users, "Cộng đồng", "Học viên có thể báo lỗi, góp ý và chia sẻ kinh nghiệm để nội dung ngày càng tốt hơn."],
          [Heart, "Miễn phí", "Tất cả tính năng học tập đều miễn phí, không giới hạn số lần làm bài."],
        ].map(([I, t, d]) => {
          const Icon = I as typeof Heart;
          return (
            <div key={t as string} className="card p-6">
              <Icon className="h-6 w-6 text-ui-brand-bright" />
              <h2 className="mt-3 font-bold">{t as string}</h2>
              <p className="mt-1 text-sm text-ui-secondary">{d as string}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-10 flex justify-center gap-3">
        <Link href="/gop-y-chia-se" className="btn btn-outline">Góp ý cho chúng tôi</Link>
        <Link href="/luyen-de-toeic" className="btn btn-primary">Bắt đầu luyện thi</Link>
      </div>
      <p className="mt-10 text-center text-xs text-ui-faint">TOEIC® là thương hiệu đã đăng ký của ETS. QEnglishIT không liên kết hay được ETS chứng thực.</p>
    </div>
  );
}
