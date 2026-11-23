# Tiến độ clone — QEnglishIT

Cập nhật: 23/11/2026

## Tổng quan

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Phân tích anhngu24h.com | ✅ | SPA React (Lovable) + Supabase, ~120 route, 22 bảng. Xem `CLONE_PLAN.md` |
| Schema Supabase + RLS | ✅ | `supabase/migrations/0001–0003`, 30 bảng, RLS toàn bộ, bucket `documents`, `recordings` |
| Next.js app + thương hiệu QEnglishIT | ✅ | 64 route, build production thành công |
| Nội dung gốc (subagent) | ✅ | Xem bảng dưới |
| Kiểm tra trên trình duyệt | ✅ | Trang chủ, đề thi, làm bài Part 3, ngữ pháp, từ vựng |
| GitHub + Vercel | 🟡 | Xem README |

## Nội dung đã nạp vào Supabase

| Loại | Số lượng | Nguồn |
|---|---|---|
| Đề TOEIC full test | 2 đề × 200 câu (103 nhóm câu/đề) | `content/tests/` |
| Chủ điểm ngữ pháp | 41 (246 bài tập + 328 câu quiz) | `content/grammar/` |
| Từ vựng | 9 bộ, 93 bài, 1.930 mục | `content/vocab/` |
| Bài đọc song ngữ | 24 | `content/reading/` |
| Bài nghe song ngữ / giáo trình | 16 / 12 | `content/listening/` |
| Speaking / Writing | 20 / 16 | `content/speaking/`, `content/writing/` |
| Blog / Tài liệu / Khóa học | 12 / 10 / 4 (52 bài học) | `content/blog/`, `documents/`, `courses/` |

## Tính năng đã clone

- **Đề thi**: danh sách theo bộ đề, trạng thái làm bài, lượt làm; hộp chọn chế độ Thi thử/Luyện tập, Full test hoặc theo Part, tự đặt thời gian; giao diện làm bài chia đôi màn hình, audio TTS nhiều giọng, phím tắt (Space, R, 1–4, ←→, ↑↓), bảng câu hỏi, đánh dấu câu, bản dịch, tự lưu bài làm dở, tự nộp khi hết giờ; kết quả thang 990, phân tích theo Part, dạng câu yếu, bảng đáp án, xem lại giải thích & transcript; lịch sử + biểu đồ điểm; luyện chuyên sâu Part 1–7; báo lỗi câu hỏi.
- **Ngữ pháp**: lọc theo mức 450/600/700/800 và nhóm, tìm kiếm, bài học 5 tab (Bài giảng — Ví dụ — Mẹo — Bài tập — Quiz), tiến độ, lộ trình ngữ pháp.
- **Nghe**: nghe chép theo Part / theo đề với 4 chế độ (Điền từ, Nghe check, Nghe chép, Nghe full), nghe song ngữ, giáo trình nghe, lưu tiến độ.
- **Đọc**: đọc song ngữ 3 chế độ hiển thị, đọc to từng đoạn, câu hỏi có giải thích, từ vựng then chốt.
- **Nói / Viết**: đếm giờ chuẩn bị & trả lời, ghi âm qua micro (lưu Storage), bài mẫu đọc TTS; viết có đồng hồ, đếm từ, kiểm tra từ khoá, lưu bài.
- **Từ vựng**: 6 nhóm (TOEIC, 1000 từ/50 ngày, 3000 từ, IELTS, VSTEP, Giao tiếp), tra từ, bài học 4 chế độ (Danh sách, Flashcard, Trắc nghiệm, Nghe–viết), SRS (SM-2), giỏ từ ♥, bộ từ cá nhân, ôn tập hôm nay, thống kê.
- **Khóa học & lộ trình**: 4 khóa học, trình học bài với đánh dấu hoàn thành, lộ trình 3 giai đoạn.
- **Tài khoản**: đăng ký/đăng nhập email + Google, quên/đặt lại mật khẩu, dashboard (streak, XP, heatmap 12 tuần, điểm mạnh/yếu theo Part, biểu đồ điểm), hồ sơ + mục tiêu, link giới thiệu `/r/[code]`, hộp thư phản hồi 2 chiều.
- **Khác**: blog, tài liệu (tải .md / in PDF), thang điểm + máy tính điểm, đánh giá học viên (kiểm duyệt), góp ý, bảng xếp hạng, PWA cài đặt app, trang quản trị (thống kê, trả lời phản hồi, duyệt đánh giá).

## Không clone (theo yêu cầu)

`/nang-cap-pro`, `/quan-ly-pro`, `/donate` — thanh toán & gói Pro.

## Khác biệt còn lại so với bản gốc

| Hạng mục | Hiện trạng | Hướng xử lý |
|---|---|---|
| Audio | Giọng đọc TTS của trình duyệt (chất lượng tuỳ máy) | Sinh mp3 bằng TTS neural, lưu Storage, điền `audio_url` |
| Ảnh Part 1 / Speaking | Khung mô tả cảnh bằng chữ | Tạo ảnh minh hoạ, điền `image_url` |
| Số lượng đề | 2 đề (gốc ~25) | Chạy thêm subagent Test Author, `npm run seed -- tests` |
| Hỏi AI | Chưa có | Route handler gọi Claude API |
| Admin CRUD | Chỉ thống kê / phản hồi / duyệt đánh giá | Trình soạn đề & import Excel |
| Bộ từ 1000/50 ngày | 20/50 ngày | Bổ sung ngày 21–50 |
