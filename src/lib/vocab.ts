import { supabasePublic } from "./supabase/public";

export const FAMILIES: Record<string, { route: string; title: string; highlight: string; desc: string; badge: string }> = {
  toeic: { route: "/tu-vung-toeic", title: "Từ vựng TOEIC theo", highlight: "chủ đề", desc: "Từ vựng chọn lọc theo đề thi thực tế, học thông minh để nhớ lâu hơn.", badge: "Từ vựng TOEIC" },
  "1000-50-ngay": { route: "/1000-tu-vung-toeic-50-ngay", title: "1000 từ TOEIC trong", highlight: "50 ngày", desc: "Mỗi ngày 20 từ, sắp xếp từ dễ đến khó, kèm ôn tập lặp lại ngắt quãng.", badge: "Lộ trình 50 ngày" },
  "3000": { route: "/3000-tu-vung-tieng-anh-thong-dung", title: "3000 từ tiếng Anh", highlight: "thông dụng", desc: "Nền tảng từ vựng A1 – C1 cho người mới bắt đầu.", badge: "3000 từ" },
  ielts: { route: "/tu-vung-ielts", title: "Từ vựng", highlight: "IELTS", desc: "Từ vựng học thuật theo các chủ đề Writing & Speaking thường gặp.", badge: "IELTS" },
  vstep: { route: "/tu-vung-vstep", title: "Từ vựng", highlight: "VSTEP", desc: "Từ vựng theo bậc năng lực VSTEP 3 – 5.", badge: "VSTEP" },
  "giao-tiep": { route: "/tu-vung-tieng-anh-giao-tiep", title: "Tiếng Anh", highlight: "giao tiếp", desc: "Cụm từ và mẫu câu theo tình huống thực tế.", badge: "Giao tiếp" },
  it: { route: "/tu-vung-tieng-anh-cntt", title: "Tiếng Anh", highlight: "CNTT", desc: "Từ vựng theo chủ đề lập trình, hạ tầng, bảo mật và dữ liệu.", badge: "Công nghệ thông tin" },
};

export async function getFamily(family: string) {
  const sb = supabasePublic();
  const { data } = await sb
    .from("vocab_collections")
    .select("id, slug, title, description, color, sort_order, vocab_lessons(id, slug, title, title_vi, day_number, sort_order, vocab_lesson_words(count))")
    .eq("family", family)
    .order("sort_order");
  return (data ?? []).map((c) => ({
    ...c,
    vocab_lessons: [...(c.vocab_lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}
