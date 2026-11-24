import { SectionShell, type ShellGroup } from "@/components/SectionShell";

const groups: ShellGroup[] = [
  {
    items: [
      { href: "/tu-vung-tieng-anh", label: "Từ vựng tiếng Anh", desc: "Khám phá thế giới từ vựng", icon: "LayoutGrid", color: "bg-ui-subtle text-ui-secondary" },
      { href: "/tu-vung-toeic", label: "Từ vựng TOEIC", desc: "Theo chủ đề, flashcard song ngữ", icon: "BookOpen", color: "bg-ui-sky-soft text-ui-sky-text" },
      { href: "/1000-tu-vung-toeic-50-ngay", label: "1000 từ TOEIC trong 50 ngày", desc: "Lộ trình 20 từ mỗi ngày", icon: "CalendarDays", color: "bg-ui-orange-soft text-ui-orange-text" },
      { href: "/3000-tu-vung-tieng-anh-thong-dung", label: "3000 từ thông dụng", desc: "A1 – C1 cho người mới bắt đầu", icon: "Languages", color: "bg-ui-indigo-soft text-ui-indigo-text" },
      { href: "/tu-vung-tieng-anh-giao-tiep", label: "Tiếng Anh giao tiếp", desc: "Cụm từ & mẫu câu theo tình huống", icon: "MessagesSquare", color: "bg-ui-pink-soft text-ui-pink-text" },
      { href: "/tu-vung-ielts", label: "Từ vựng IELTS", desc: "Học thuật theo chủ đề", icon: "GraduationCap", color: "bg-ui-rose-soft text-ui-rose-text" },
      { href: "/tu-vung-vstep", label: "Từ vựng VSTEP", desc: "Bậc 3 – Bậc 5", icon: "Landmark", color: "bg-ui-emerald-soft text-ui-emerald-text" },
    ],
  },
  {
    heading: "Cá nhân",
    items: [
      { href: "/on-tap-tu-vung", label: "Ôn tập hôm nay", desc: "Lặp lại ngắt quãng (SRS)", icon: "Repeat", color: "bg-ui-amber-soft text-ui-amber-text" },
      { href: "/vocabulary-sets", label: "Bộ từ vựng của tôi", desc: "Từ bạn đã lưu", icon: "FolderHeart", color: "bg-ui-sky-soft text-ui-sky-text" },
      { href: "/vocabulary-cart", label: "Từ đã đánh dấu", desc: "Giỏ từ vựng", icon: "Heart", color: "bg-ui-rose-soft text-ui-rose-text" },
      { href: "/tien-do-tu-vung", label: "Tiến độ luyện từ", desc: "Thống kê ghi nhớ", icon: "ChartColumn", color: "bg-ui-violet-soft text-ui-violet-text" },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionShell brandSubtitle="Học hôm nay, vững ngày mai" title="Từ vựng tiếng Anh" groups={groups}>
      {children}
    </SectionShell>
  );
}
