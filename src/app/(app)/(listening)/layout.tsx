import { SectionShell, type ShellGroup } from "@/components/SectionShell";

const groups: ShellGroup[] = [
  {
    heading: "Kỹ năng Nghe",
    items: [
      { href: "/luyen-nghe-toeic", label: "Luyện nghe chép chính tả", desc: "Theo Part, theo đề, tiến độ", icon: "PenLine", color: "bg-ui-emerald-soft text-ui-emerald-text" },
      { href: "/luyen-nghe-toeic/part-1", label: "Part 1: Hình ảnh", icon: "Image", color: "bg-ui-sky-soft text-ui-sky-text" },
      { href: "/luyen-nghe-toeic/part-2", label: "Part 2: Hỏi – Đáp", icon: "MessageCircle", color: "bg-ui-blue-soft text-ui-blue-text" },
      { href: "/luyen-nghe-toeic/part-3", label: "Part 3: Hội thoại ngắn", icon: "Users", color: "bg-ui-indigo-soft text-ui-indigo-text" },
      { href: "/luyen-nghe-toeic/part-4", label: "Part 4: Độc thoại", icon: "Mic", color: "bg-ui-violet-soft text-ui-violet-text" },
      { href: "/luyen-nghe-song-ngu", label: "Nghe song ngữ Anh – Việt", icon: "Languages", color: "bg-ui-pink-soft text-ui-pink-text" },
      { href: "/luyen-nghe-tieng-anh", label: "Giáo trình nghe A2 → B2", icon: "GraduationCap", color: "bg-ui-amber-soft text-ui-amber-text" },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionShell brandSubtitle="Listening · Part 1–4 · Dictation" title="Luyện nghe TOEIC" groups={groups}>
      {children}
    </SectionShell>
  );
}
