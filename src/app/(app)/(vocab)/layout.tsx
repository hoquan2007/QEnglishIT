import { Suspense } from "react";
import { SectionShell, type ShellGroup } from "@/components/SectionShell";

const groups: ShellGroup[] = [
  {
    items: [
      { href: "/tu-vung-tieng-anh", label: "Từ vựng tiếng Anh", desc: "Khám phá thế giới từ vựng", icon: "LayoutGrid", color: "bg-slate-100 text-slate-600" },
      { href: "/tu-dien-tieng-anh", label: "Tra từ điển", desc: "Nghĩa, phiên âm và phát âm", icon: "BookOpen", color: "bg-violet-100 text-violet-600" },
      { href: "/tu-vung-toeic", label: "Từ vựng TOEIC", desc: "Theo chủ đề, flashcard song ngữ", icon: "BookOpen", color: "bg-sky-100 text-sky-600" },
      { href: "/1000-tu-vung-toeic-50-ngay", label: "1000 từ TOEIC trong 50 ngày", desc: "Lộ trình 20 từ mỗi ngày", icon: "CalendarDays", color: "bg-orange-100 text-orange-600" },
      { href: "/3000-tu-vung-tieng-anh-thong-dung", label: "3000 từ thông dụng", desc: "A1 – C1 cho người mới bắt đầu", icon: "Languages", color: "bg-indigo-100 text-indigo-600" },
      { href: "/1000-cum-tu-tieng-anh-thong-dung", label: "1000 cụm thông dụng", desc: "50 bài học, flashcard và luyện tập", icon: "Layers", color: "bg-teal-100 text-teal-600" },
      { href: "/tu-vung-tieng-anh-giao-tiep", label: "Tiếng Anh giao tiếp", desc: "Cụm từ & mẫu câu theo tình huống", icon: "MessagesSquare", color: "bg-pink-100 text-pink-600" },
      { href: "/tu-vung-ielts", label: "Từ vựng IELTS", desc: "Học thuật theo chủ đề", icon: "GraduationCap", color: "bg-rose-100 text-rose-600" },
      { href: "/tu-vung-vstep", label: "Từ vựng VSTEP", desc: "Bậc 3 – Bậc 5", icon: "Landmark", color: "bg-emerald-100 text-emerald-600" },
    ],
  },
  {
    heading: "Cá nhân",
    items: [
      { href: "/on-tap-tu-vung", label: "Ôn tập hôm nay", desc: "Lặp lại ngắt quãng (SRS)", icon: "Repeat", color: "bg-amber-100 text-amber-600" },
      { href: "/vocabulary-sets", label: "Bộ từ vựng của tôi", desc: "Từ bạn đã lưu", icon: "FolderHeart", color: "bg-sky-100 text-sky-600" },
      { href: "/vocabulary-cart", label: "Từ đã đánh dấu", desc: "Giỏ từ vựng", icon: "Heart", color: "bg-rose-100 text-rose-600" },
      { href: "/tien-do-tu-vung", label: "Tiến độ luyện từ", desc: "Thống kê ghi nhớ", icon: "ChartColumn", color: "bg-violet-100 text-violet-600" },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <SectionShell brandSubtitle="Học hôm nay, vững ngày mai" title="Từ vựng tiếng Anh" groups={groups}>
        {children}
      </SectionShell>
    </Suspense>
  );
}
