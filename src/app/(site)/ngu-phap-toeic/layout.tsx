import { SubTabs } from "@/components/SubTabs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SubTabs
        tabs={[
          { href: "/ngu-phap-toeic", label: "Học", icon: "GraduationCap" },
          { href: "/ngu-phap-toeic/tien-do", label: "Tiến độ", icon: "BarChart3" },
          { href: "/lo-trinh-ngu-phap-toeic", label: "Lộ trình", icon: "Map" },
        ]}
      />
      {children}
    </div>
  );
}
