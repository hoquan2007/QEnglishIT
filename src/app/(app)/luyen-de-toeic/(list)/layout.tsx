import { SectionShell, type ShellGroup } from "@/components/SectionShell";
import { PARTS } from "@/lib/toeic";

const PART_COLORS = ["bg-sky-100 text-sky-600", "bg-blue-100 text-blue-600", "bg-indigo-100 text-indigo-600", "bg-violet-100 text-violet-600", "bg-emerald-100 text-emerald-600", "bg-teal-100 text-teal-600", "bg-cyan-100 text-cyan-600"];

const groups: ShellGroup[] = [
  {
    heading: "Luyện đề",
    items: [
      { href: "/luyen-de-toeic", label: "Tất cả đề thi", desc: "Chưa làm, đang làm dở & đã xong", icon: "FileStack" },
      { href: "/luyen-de-toeic/tien-do", label: "Tiến độ luyện đề", desc: "Biểu đồ điểm & lịch sử thi", icon: "BarChart3", color: "bg-orange-100 text-orange-600" },
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
