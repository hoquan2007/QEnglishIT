export type NavItem = { label: string; href: string; icon: string; children?: { label: string; href: string; desc?: string }[] };

export const NAV: NavItem[] = [
  { label: "Ngữ pháp", href: "/ngu-phap-toeic", icon: "BookOpen" },
  { label: "Khóa học", href: "/hoc-toeic-online", icon: "GraduationCap" },
  {
    label: "Nghe",
    href: "/luyen-nghe-toeic",
    icon: "Headphones",
    children: [
      { label: "Luyện nghe TOEIC", href: "/luyen-nghe-toeic", desc: "Part 1–4 & nghe chép chính tả" },
      { label: "Nghe song ngữ", href: "/luyen-nghe-song-ngu", desc: "Hội thoại Anh – Việt theo câu" },
      { label: "Luyện nghe tiếng Anh", href: "/luyen-nghe-tieng-anh", desc: "Giáo trình nghe A2 → B2" },
    ],
  },
  { label: "Đọc", href: "/luyen-doc-toeic", icon: "FileText" },
  {
    label: "Nói - Viết",
    href: "/luyen-noi-toeic",
    icon: "PenLine",
    children: [
      { label: "Luyện nói TOEIC", href: "/luyen-noi-toeic", desc: "11 câu Speaking, ghi âm & bài mẫu" },
      { label: "Luyện viết TOEIC", href: "/luyen-viet-toeic", desc: "8 câu Writing, bấm giờ & bài mẫu" },
    ],
  },
  { label: "Đề thi", href: "/luyen-de-toeic", icon: "Flame" },
  { label: "Từ vựng", href: "/tu-vung-tieng-anh", icon: "Library" },
  { label: "Lộ trình", href: "/lo-trinh-hoc-toeic", icon: "Map" },
  {
    label: "About",
    href: "/about",
    icon: "Info",
    children: [
      { label: "Giới thiệu", href: "/about" },
      { label: "Blog TOEIC", href: "/blog" },
      { label: "Tài liệu", href: "/tai-lieu" },
      { label: "Thang điểm TOEIC", href: "/thang-diem-toeic" },
      { label: "Đánh giá học viên", href: "/danh-gia" },
      { label: "Bảng xếp hạng", href: "/bang-xep-hang" },
      { label: "Góp ý & chia sẻ", href: "/gop-y-chia-se" },
    ],
  },
];
