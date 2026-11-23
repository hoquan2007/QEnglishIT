# Tiến độ clone — QEnglishIT

Cập nhật: 24/11/2026

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

## Mở rộng dữ liệu theo Plandataenglish — 23–24/11/2026

**Toàn bộ kế hoạch chưa hoàn thành.** Đã triển khai nền tảng S0, một phần S1 và các lô đầu tiên của S7/S8. Chưa đạt điều kiện tạo PR `content: data expansion v1`.

### Kết quả đã kiểm chứng trên Supabase

| Hạng mục | Hiện tại | Thay đổi trong đợt này |
|---|---:|---|
| Đề thi | 8 | Thêm 1 Part 5 và 5 vocab test; cả 6 đang nháp |
| Đề đã xuất bản | 2 | Giữ hai đề cũ; không tự xuất bản đề chưa được admin duyệt |
| Câu hỏi | 690 | Thêm 290; đã giải độc lập toàn bộ câu mới, sửa các câu mơ hồ rồi giải lại |
| Fingerprint | 690/690 | Không thiếu, không trùng; chạy lại seed giữ nguyên ID nhóm/câu |
| Từ vựng DB | 1.553 bản ghi / 1.534 lemma | Chưa nạp headword thô thành từ hoàn chỉnh |
| Cụm từ | 200 | 50 phrasal verbs, 50 idioms, 100 collocations; hai ví dụ song ngữ/mục |
| Bài âm IPA | 44 | 217 lượt cặp tối thiểu / 154 cặp khác nhau; chưa đạt 300 cặp |
| Động từ bất quy tắc | 100 | Chưa đạt 200 |
| Tài liệu | 26 | Thêm 16 liên kết tài nguyên ngoài, không sao chép nội dung |
| Danh mục nguồn | 11 | Giấy phép và ghi công đã lưu; có trang `/nguon-tai-lieu` |

Migration `0004_content_expansion.sql` và `0005_listening_media.sql` đã áp dụng thực tế.
Migration 0005 bổ sung cột audio cho bài nghe độc lập, còn thiếu trong schema cũ.
RLS chặn người đọc ẩn danh truy cập đề nháp và câu hỏi nháp; nguồn tài liệu vẫn đọc công khai.

### Danh sách từ và media

- `content/vocab/headwords.json`: **10.500 lemma**, chuẩn hóa các cặp chính tả đã có chứng cứ và bổ sung lại sau khi gộp trùng.
- Kho IPA riêng: US **10.383**, UK **10.127**, có cả hai **10.068**; thiếu 117 US và 373 UK. **S1 chưa đạt 100%**.
- CEFR suy từ rank được phân biệt với mức có trong CEFR-J. Từ thiếu POS/rank vẫn được báo, không tự bịa thông tin.
- Đây là danh sách chờ biên soạn; chưa có 10.000 từ hoàn chỉnh với nghĩa, hai ví dụ song ngữ và audio trong DB.
- Pipeline TTS/upload đã có và kiểm tra chế độ lỗi/resume; **chưa sinh hoặc upload audio**. Cần cấu hình engine/voice thực tế và FFmpeg/FFprobe.
- IPA UK của ipa-dict có nguồn **GPL-3.0**, không phải MIT như giả định trong plan; giữ riêng dữ liệu và thông báo giấy phép. Không đổi nhãn thành nội dung gốc.

### Kiểm tra

- `npm run content:test`: **49/49 pass**; Python vocabulary: **5/5 pass**.
- `npm run typecheck`: pass; ESLint: 0 lỗi, hai cảnh báo điều hướng có sẵn.
- `npm run seed -- --dry-run`: pass, 0 lỗi; **10.580 cảnh báo** về dữ liệu cũ còn thiếu chuẩn mở rộng được giữ nguyên để xử lý, không coi là đã hoàn thiện.
- Các lô mới qua validator strict. Sáu kết quả giải độc lập và sáu mẫu admin đang chờ đã ghi vào `content_qa`.
- `/nguon-tai-lieu`: HTTP 200, đọc được nguồn US/UK và giấy phép GPL. Trình duyệt tích hợp không truy cập được localhost; chưa có xác minh ảnh chụp giao diện.
- `npm run build -- --webpack`: pass. Build mặc định Turbopack lỗi tạo tiến trình xử lý CSS, kể cả chạy ngoài sandbox; chưa sửa lỗi môi trường này.
- Advisors: không phát sinh cảnh báo bảo mật mới. Vẫn có 7 cảnh báo quyền hàm cho anon và 8 cho authenticated từ trước; performance còn một FK cũ thiếu index và thông tin index chưa được dùng. Không báo hệ thống đã sạch toàn bộ advisors.

Báo cáo số liệu thực tế: `content/_reports/expansion-2026-11-23.json`.
Hướng dẫn chạy: `docs/CONTENT_EXPANSION.md`, `scripts/vocab/README.md`, `scripts/audio/README.md`.
Mẫu cần admin kiểm tra: `docs/ADMIN_CONTENT_REVIEW.md` (chưa đánh dấu duyệt).

### Việc tiếp theo

1. Bổ sung IPA còn thiếu và duyệt POS/CEFR; biên soạn 21 lô từ hoàn chỉnh, không dùng danh sách headword thay thế dữ liệu học tập.
2. Thiết lập TTS/FFmpeg, tạo và kiểm tra audio thật trước khi upload; kiểm tra dung lượng Storage trước các lô lớn.
3. Biên soạn đủ đề, audio và ảnh theo S4–S6/S9–S11; hiện mới có 8/300 đề và 690/25.000 câu.
4. Mở rộng phrases, minimal pairs, irregular verbs; thêm grammar/reading/listening/speaking/writing/blog/courses theo mục tiêu.
5. Hoàn thiện UI loại đề/câu hỏi mới và các trang học liệu; admin duyệt mẫu trước khi xuất bản.

Các sai lệch số học của plan đã ghi tại `docs/CONTENT_EXPANSION.md`: 315 đề mới theo tổng từng dòng; cần thêm 372 bài nghe để từ 28 lên 400.
