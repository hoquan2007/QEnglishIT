import { Suspense } from "react";
import { SectionShell, type ShellGroup } from "@/components/SectionShell";

const groups: ShellGroup[] = [
  {
    heading: "Kỹ năng Nghe",
    items: [
      { href: "/luyen-nghe-toeic", label: "Luyện nghe chép chính tả", desc: "Theo Part, theo đề, tiến độ", icon: "PenLine", color: "bg-emerald-100 text-emerald-600" },
      { href: "/luyen-nghe-toeic/part-1", label: "Part 1: Hình ảnh", icon: "Image", color: "bg-sky-100 text-sky-600" },
      { href: "/luyen-nghe-toeic/part-2", label: "Part 2: Hỏi – Đáp", icon: "MessageCircle", color: "bg-blue-100 text-blue-600" },
      { href: "/luyen-nghe-toeic/part-3", label: "Part 3: Hội thoại ngắn", icon: "Users", color: "bg-indigo-100 text-indigo-600" },
      { href: "/luyen-nghe-toeic/part-4", label: "Part 4: Độc thoại", icon: "Mic", color: "bg-violet-100 text-violet-600" },
      { href: "/luyen-nghe-song-ngu", label: "Nghe song ngữ Anh – Việt", icon: "Languages", color: "bg-pink-100 text-pink-600" },
      { href: "/luyen-nghe-tieng-anh", label: "Giáo trình nghe A2 → B2", icon: "GraduationCap", color: "bg-amber-100 text-amber-600" },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <SectionShell brandSubtitle="Listening · Part 1–4 · Dictation" title="Luyện nghe TOEIC" groups={groups}>
        {children}
      </SectionShell>
    </Suspense>
  );
}
