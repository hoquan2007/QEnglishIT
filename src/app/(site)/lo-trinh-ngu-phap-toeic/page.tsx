import Link from "next/link";
import { supabasePublic } from "@/lib/supabase/public";
import { SubTabs } from "@/components/SubTabs";

export const metadata = { title: "Lộ trình ngữ pháp TOEIC" };
export const revalidate = 300;

const LEVELS = [
  { lv: "450", title: "Nền tảng", desc: "Thì cơ bản, từ loại, câu đơn." },
  { lv: "600", title: "Trung cấp", desc: "Bị động, so sánh, giới từ, liên từ." },
  { lv: "700", title: "Khá", desc: "Mệnh đề quan hệ, câu điều kiện, danh động từ." },
  { lv: "800", title: "Nâng cao", desc: "Đảo ngữ, giả định, rút gọn mệnh đề, bẫy Part 5." },
];

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("grammar_topics").select("slug, title, title_vi, level, sort_order").order("sort_order");
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <SubTabs tabs={[{ href: "/ngu-phap-toeic", label: "Học", icon: "GraduationCap" }, { href: "/ngu-phap-toeic/tien-do", label: "Tiến độ", icon: "BarChart3" }, { href: "/lo-trinh-ngu-phap-toeic", label: "Lộ trình", icon: "Map" }]} />
      <h1 className="text-3xl font-extrabold">Lộ trình ngữ pháp TOEIC</h1>
      <p className="mt-1 text-ui-secondary">Học theo thứ tự từ TOEIC 450+ đến 800+. Hoàn thành Quiz ≥ 70% để mở khoá cảm giác chinh phục từng chủ điểm.</p>
      <div className="mt-6 space-y-5">
        {LEVELS.map((L, i) => (
          <div key={L.lv} className="card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-ui-brand-fill font-bold text-white">{i + 1}</span>
              <div><div className="text-lg font-extrabold">TOEIC {L.lv}+ · {L.title}</div><div className="text-sm text-ui-muted">{L.desc}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(data ?? []).filter((t) => t.level === L.lv).map((t) => (
                <Link key={t.slug} href={`/ngu-phap-toeic/${t.slug}`} className="chip hover:!border-ui-brand-outline hover:!text-ui-brand-strong">{t.title}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
