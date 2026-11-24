import Link from "next/link";
import { Logo } from "./Logo";

const COLS = [
  { title: "Luyện thi", links: [["Đề thi TOEIC", "/luyen-de-toeic"], ["Luyện theo Part", "/luyen-part-5-toeic"], ["Thang điểm", "/thang-diem-toeic"], ["Lộ trình học", "/lo-trinh-hoc-toeic"]] },
  { title: "Kỹ năng", links: [["Ngữ pháp", "/ngu-phap-toeic"], ["Nghe", "/luyen-nghe-toeic"], ["Đọc song ngữ", "/luyen-doc-toeic"], ["Nói – Viết", "/luyen-noi-toeic"]] },
  { title: "Từ vựng", links: [["Từ vựng TOEIC", "/tu-vung-toeic"], ["1000 từ / 50 ngày", "/1000-tu-vung-toeic-50-ngay"], ["IELTS", "/tu-vung-ielts"], ["Giao tiếp", "/tu-vung-tieng-anh-giao-tiep"]] },
  { title: "QEnglishIT", links: [["Giới thiệu", "/about"], ["Blog", "/blog"], ["Tài liệu", "/tai-lieu"], ["Nguồn tài liệu", "/nguon-tai-lieu"], ["Góp ý", "/gop-y-chia-se"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ui-line bg-ui-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ui-muted">
            Nền tảng luyện thi TOEIC miễn phí: đề thi, ngữ pháp, từ vựng, nghe – đọc – nói – viết với giải thích chi tiết.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="mb-3 text-sm font-bold text-ui-title">{c.title}</div>
            <ul className="space-y-2 text-sm text-ui-muted">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-ui-brand-text">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ui-divider py-5 text-center text-xs text-ui-faint">
        © {new Date().getFullYear()} QEnglishIT. TOEIC® là thương hiệu của ETS; QEnglishIT không liên kết với ETS.
      </div>
    </footer>
  );
}
