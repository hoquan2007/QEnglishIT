export const PARTS = [
  { part: 1, name: "Part 1", title: "Mô tả hình ảnh", skill: "Nghe", count: 6, range: [1, 6] },
  { part: 2, name: "Part 2", title: "Hỏi – Đáp", skill: "Nghe", count: 25, range: [7, 31] },
  { part: 3, name: "Part 3", title: "Hội thoại ngắn", skill: "Nghe", count: 39, range: [32, 70] },
  { part: 4, name: "Part 4", title: "Bài nói ngắn", skill: "Nghe", count: 30, range: [71, 100] },
  { part: 5, name: "Part 5", title: "Hoàn thành câu", skill: "Đọc", count: 30, range: [101, 130] },
  { part: 6, name: "Part 6", title: "Hoàn thành đoạn văn", skill: "Đọc", count: 16, range: [131, 146] },
  { part: 7, name: "Part 7", title: "Đọc hiểu", skill: "Đọc", count: 54, range: [147, 200] },
] as const;

export const isListeningPart = (p: number) => p <= 4;

// Approximate raw → scaled conversion (linear interpolation between anchor points).
const L_POINTS: [number, number][] = [
  [0, 5], [6, 5], [10, 25], [20, 95], [30, 150], [40, 200], [50, 255], [60, 310],
  [70, 365], [76, 400], [80, 420], [90, 470], [93, 485], [96, 495], [100, 495],
];
const R_POINTS: [number, number][] = [
  [0, 5], [10, 15], [20, 65], [30, 120], [40, 175], [50, 230], [60, 285],
  [70, 340], [80, 395], [90, 445], [95, 470], [97, 485], [100, 495],
];

function interpolate(points: [number, number][], raw: number) {
  const r = Math.max(0, Math.min(100, raw));
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (r <= x1) {
      const y = y0 + ((r - x0) / (x1 - x0 || 1)) * (y1 - y0);
      return Math.min(495, Math.max(5, Math.round(y / 5) * 5));
    }
  }
  return 495;
}

export const scaleListening = (correct: number, total = 100) => interpolate(L_POINTS, (correct / total) * 100);
export const scaleReading = (correct: number, total = 100) => interpolate(R_POINTS, (correct / total) * 100);

export function scoreLevel(total: number) {
  if (total >= 905) return { label: "Thành thạo quốc tế", color: "text-emerald-600", cefr: "C1" };
  if (total >= 785) return { label: "Nâng cao", color: "text-sky-600", cefr: "B2" };
  if (total >= 550) return { label: "Trung cấp", color: "text-cyan-600", cefr: "B1" };
  if (total >= 225) return { label: "Sơ cấp", color: "text-amber-600", cefr: "A2" };
  return { label: "Mới bắt đầu", color: "text-rose-600", cefr: "A1" };
}

export const SCORE_TABLE = [
  { range: "905 – 990", level: "Thành thạo quốc tế", cefr: "C1", desc: "Giao tiếp trôi chảy trong hầu hết tình huống công việc chuyên môn." },
  { range: "785 – 900", level: "Nâng cao", cefr: "B2", desc: "Xử lý tốt các tình huống công việc, đọc hiểu tài liệu phức tạp." },
  { range: "550 – 780", level: "Trung cấp", cefr: "B1", desc: "Đáp ứng yêu cầu giao tiếp công việc cơ bản, đọc email và thông báo." },
  { range: "225 – 545", level: "Sơ cấp", cefr: "A2", desc: "Hiểu câu đơn giản, hội thoại ngắn quen thuộc." },
  { range: "10 – 220", level: "Mới bắt đầu", cefr: "A1", desc: "Vốn từ và ngữ pháp còn hạn chế." },
];
