# Tiến độ clone — QEnglishIT

Cập nhật: 24/11/2026 (xem snapshot live mới nhất bên dưới)

## Snapshot live mới nhất — 24/11/2026

Đối chiếu `Plandataenglish.md` bằng QA live sau khi seed Core-022, bộ 3000 từ thông dụng, bộ IELTS Academic và Batch nghe 006.

| Chỉ tiêu | Live / mục tiêu | Thiếu |
|---|---:|---:|
| Đề thi | 171 / 300 | 129 |
| Câu hỏi đề thi | 6.743 / 25.000 | 18.257 |
| Lemma phân biệt | 5.183 / 10.000 | 4.817 |
| Bài nghe có audio URL | 237 / 400 | 163 |
| Chủ điểm ngữ pháp đủ bài tập và quiz | 120 / 120 | 0 |
| Câu hỏi ngữ pháp | 2.400 / 2.400 | 0 |
| Bài đọc | 500 / 500 | 0 |
| Speaking / Writing | 200 / 150 (đạt cả hai mục tiêu) | 0 |
| Blog / Tài liệu / Khóa học | 100 / 60 / 12 (đạt) | 0 |
| Phrasal verbs / Idioms / Collocations / Expressions | 800 / 500 / 1.500 / 400 (đạt) | 0 |
| Âm IPA / Cặp tối thiểu / Động từ bất quy tắc | 44 / 625 / 200 (đạt) | 0 |

Phân bổ đề live (mục tiêu tính cả hai đề cũ): full 2/62, mini 1/30, listening 0/15, reading 0/15, part 83/70, SW 0/10, THPT 11/25, VSTEP 0/15, IELTS reading 0/15, IELTS listening 0/15, placement 0/5, grammar 44/20, vocab 30/20. Part 3 và 4 còn thiếu 3 đề mỗi loại; không dùng đề dư của Part 5/7 để thay thế. Đã xuất bản 2 đề. Fingerprint không thiếu, không trùng, không sai lệch.

Từ vựng có 5.204 bản ghi: thiếu IPA US 150, IPA UK 424, audio US 3.256, audio UK 3.256 (thiếu 2.736 bản ghi để đạt ngưỡng 90%), thiếu hai ví dụ song ngữ và nguồn 1.474. Đã seed Core-021/022 mỗi batch 150 lemma có IPA US/UK và ví dụ gốc. Audio Batch 020 đã upload. Audio Batch 021 đang tạo tại thời điểm snapshot. Tổng 12 bộ từ, 146 bài, 5.850 liên kết từ/bài. Hai bộ mới đã seed: IELTS Academic 20×40 và 3000 từ thông dụng 30×100 (3.000 lemma khác nhau, dựa trên tần suất và CEFR A1–C1, giữ bộ 5 bài cũ). Các bộ mục 6.3 còn lại chưa hoàn thành.

Batch nghe 006: 78 MP3 mới đã được xác minh hash và khớp nội dung nguồn, seed và đồng bộ metadata có receipt. Phân bổ 237 bài nghe: 120 song ngữ, 117 giáo trình. Cả 44 bài âm IPA có URL audio. Báo cáo DB xác nhận URL; chưa kiểm tra lại toàn bộ media lịch sử. Batch 007 đang tạo. THPT 019–021 đã soạn 150 câu gốc, chưa seed vì còn kiểm định. Các đề sửa cũng chờ blind review mới.

Chưa đạt Definition of Done; còn thiếu nhiều đề, audio và bộ từ, chưa tạo PR hoàn thành kế hoạch.

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
| Đề thi (tổng) | **79 đề, 3.594 câu hỏi**; 2 TOEIC full đã xuất bản, 77 đề nháp | `content/tests/` |
| Chủ điểm ngữ pháp | **120 chủ điểm, 2.400 câu**; cả 120 đạt ≥ 10 bài tập và ≥ 10 quiz | `content/grammar/` |
| Từ vựng | 2.454 bản ghi, 2.433 lemma khác nhau; 10 bộ, 96 bài, 2.050 liên kết từ/bài | `content/vocab/` |
| Bài đọc song ngữ | **500 bài**; A2/B1/B2/C1 = 100/150/150/100 | `content/reading/` |
| Bài nghe song ngữ / giáo trình | 28 bài, chưa có audio được gắn | `content/listening/` |
| Speaking / Writing | **200 / 150**, đạt mục tiêu | `content/speaking/`, `content/writing/` |
| Blog / Tài liệu / Khóa học | **100 / 60 / 12** (124 bài học) | `content/blog/`, `documents/`, `courses/` |

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
| Số lượng đề | **79/300 đề, 3.594/25.000 câu**; 77 đề nháp | Tiếp tục Test Author, kiểm định độc lập, duyệt admin trước xuất bản |
| Hỏi AI | Chưa có | Route handler gọi Claude API |
| Admin CRUD | Chỉ thống kê / phản hồi / duyệt đánh giá | Trình soạn đề & import Excel |
| Bộ từ 1000/50 ngày | 20/50 ngày | Bổ sung ngày 21–50 |

## Mở rộng dữ liệu theo Plandataenglish — 23–24/11/2026

**Toàn bộ kế hoạch chưa hoàn thành.** Đã triển khai nền tảng S0, một phần S1 và các lô đầu tiên của S7/S8. Chưa đạt điều kiện tạo PR `content: data expansion v1`.

### Kiểm tra live trên Supabase ngày 24/11/2026

Đã chạy kiểm tra database sau khi nạp các lô ngữ pháp, blog, speaking/writing, bài đọc, từ vựng và cụm từ mới. Số liệu lấy trực tiếp từ Supabase, phân biệt câu hỏi đề thi (`questions`) với câu luyện tập ngữ pháp (`grammar_questions`).

| Hạng mục | Đã đạt / mục tiêu | Còn thiếu |
|---|---:|---:|
| Đề thi | **79 / 300** | 221 |
| Câu hỏi đề thi | **3.594 / 25.000** | 21.406 |
| Lemma từ vựng duy nhất | **2.433 / 10.000** | 7.567 |
| Chủ điểm ngữ pháp đủ 10 bài tập và 10 quiz | **120 / 120** | **0** |
| Câu luyện ngữ pháp | **2.400 / 2.400** | **0** |
| Bài đọc | **500 / 500** | **0** |
| Bài nghe có nội dung | **28 / 400** | 372 |
| Speaking / Writing | **200 / 200** và **150 / 150** | **0 / 0** |
| Blog / Tài liệu / Khoá học | **100 / 100**, **60 / 60**, **12 / 12** | **0 / 0 / 0** |
| Phrasal verbs / Idioms | **800 / 800** và **500 / 500** | **0 / 0** |
| Collocations / Expressions | **1.500 / 1.500** và **400 / 400** | **0 / 0** |
| Âm IPA / Cặp tối thiểu / Động từ bất quy tắc | 44 / 44, 624 / 300, 200 / 200 | **0 / 0 / 0** |

**Chất lượng còn thiếu:** 150 bản ghi từ chưa có IPA US, 424 thiếu IPA UK, 2.256 thiếu URL audio US và 2.256 thiếu URL audio UK, 1.474 thiếu ≥ 2 ví dụ song ngữ và nguồn. Hiện có **0/400 bài nghe live** và **0/44 bài âm IPA** được gắn URL audio. Pipeline Kokoro/FFmpeg/Storage đã được chứng minh end-to-end và các batch audio mới đang chạy; chỉ tính audio khi URL thật và file media đã được kiểm tra.

**Đề đã biên soạn:** database có TOEIC full 2 / 400 câu, TOEIC Part 22 / 684 câu, THPT 11 / 550 câu, grammar test 24 / 960 câu và vocab test **20/20** / 1.000 câu. Mới 2 TOEIC full được xuất bản, 77 đề còn ở trạng thái nháp. Trên đĩa hiện có **82 đề / 3.675 câu**; ba đề TOEIC Part vòng 003 mới vẫn chờ blind review trước khi seed. Validator strict toàn thư mục `content/tests/` đã qua **0 lỗi** ở lần kiểm tra gần nhất và fingerprint DB có **0 trùng, 0 thiếu, 0 sai lệch**.

**Trọng tâm tiếp theo:** bổ sung dữ liệu từ vựng hoàn chỉnh và audio có giấy phép rõ ràng, mở rộng kho bài đọc/nghe và ngân hàng đề. Speaking/Writing đã đạt số lượng. Các bộ mới phải qua validator và kiểm định trước seed. Cần kiểm tra lại trạng thái live sau mỗi lượt seed.

### Nhật ký lịch sử của đợt seed đầu (23/11/2026)

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

- `npm run content:test`: **54/54 pass** ở lần chạy gần nhất; Python vocabulary: **5/5 pass** ở lần kiểm tra pipeline gần nhất.
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
3. Biên soạn đủ đề, audio và ảnh theo S4–S6/S9–S11; snapshot mới nhất có 79/300 đề và 3.594/25.000 câu trên database.
4. Mở rộng phrases, minimal pairs, irregular verbs; thêm grammar/reading/listening/speaking/writing/blog/courses theo mục tiêu.
5. Hoàn thiện UI loại đề/câu hỏi mới và các trang học liệu; admin duyệt mẫu trước khi xuất bản.

Các sai lệch số học của plan đã ghi tại `docs/CONTENT_EXPANSION.md`: 315 đề mới theo tổng từng dòng; cần thêm 372 bài nghe để từ 28 lên 400.
