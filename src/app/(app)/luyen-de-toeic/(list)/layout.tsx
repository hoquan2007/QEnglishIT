import { SectionShell, type ShellGroup } from "@/components/SectionShell";
import { PARTS } from "@/lib/toeic";

const PART_COLORS = ["bg-ui-sky-soft text-ui-sky-text", "bg-ui-blue-soft text-ui-blue-text", "bg-ui-indigo-soft text-ui-indigo-text", "bg-ui-violet-soft text-ui-violet-text", "bg-ui-emerald-soft text-ui-emerald-text", "bg-ui-teal-soft text-ui-teal-text", "bg-ui-cyan-soft text-ui-cyan-text"];

const groups: ShellGroup[] = [
  {
    heading: "Luyện đề",
    items: [
      { href: "/luyen-de-toeic", label: "Tất cả đề thi", desc: "Chưa làm, đang làm dở & đã xong", icon: "FileStack" },
      { href: "/luyen-de-toeic/tien-do", label: "Tiến độ luyện đề", desc: "Biểu đồ điểm & lịch sử thi", icon: "BarChart3", color: "bg-ui-orange-soft text-ui-orange-text" },
    ],
  },
  {
    heading: "Luyện chuyên sâu theo Part",
    items: PARTS.map((p, i) => ({
      href: `/luyen-part-${p.part}-toeic`,
      label: p.name,
      desc: `${p.skill} • ${p.count} câu/đề`,
      icon: p.part <= 4 ? "Headphones" : "BookOpenText",
      color: PART_COLORS[i],
    })),
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionShell brandSubtitle="Luyện đề TOEIC sát đề thật" title="Luyện đề TOEIC" groups={groups}>
      {children}
    </SectionShell>
  );
}
