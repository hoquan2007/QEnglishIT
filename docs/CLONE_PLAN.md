# QEnglishIT — Kế hoạch clone anhngu24h.com

> Nguồn phân tích: anhngu24h.com (React SPA trên Lovable + Supabase, ~120 route, 22 bảng dữ liệu).
> Mục tiêu: tái tạo **toàn bộ tính năng** (trừ Nâng cấp Pro / mua gói / donate thanh toán) dưới thương hiệu **QEnglishIT**,
> lưu dữ liệu trên Supabase `xsfapzzjzndehmqnrmef`, code trên GitHub `hoquan2007/QEnglishIT`, deploy Vercel.

## 0. Nguyên tắc clone

| Clone 1:1 | Không sao chép, tự làm lại |
|---|---|
| Cấu trúc route, menu, luồng học | Câu hỏi, đề thi, audio, ảnh, bài viết của anhngu24h (bản quyền được bảo lưu ở footer của họ) |
| Chức năng: làm đề, chấm điểm 990, nghe chép, flashcard SRS, tiến độ, streak/XP | Logo, tên thương hiệu → QEnglishIT |
| Mô hình dữ liệu (tests → question_groups → questions …) | Nội dung học tập → do các subagent soạn mới, lưu vào Supabase |

Audio: dùng Web Speech API (TTS trên trình duyệt) đọc transcript, nhiều giọng cho hội thoại → không cần file mp3.
Giai đoạn sau có thể sinh mp3 bằng TTS và lưu vào Supabase Storage.

## 1. Bản đồ tính năng (route nguồn → route QEnglishIT)

| Nhóm | Route | Chức năng | Trạng thái |
|---|---|---|---|
| Trang chủ | `/` | Hero, thống kê, 6 tính năng, 3 bước, CTA, PWA | ✅ Phase 1 |
| Auth | `/login` `/signup` `/forgot-password` `/reset-password` | Email/password + Google (Supabase Auth) | ✅ Phase 1 |
| Đề thi | `/luyen-de-toeic` | Danh sách đề theo bộ (tab lọc), trạng thái chưa làm/đang làm/xong, lượt làm | ✅ Phase 1 |
| | `/luyen-de-toeic/[testId]?mode=exam\|practice` | Chọn chế độ Thi thử/Luyện tập, Full test hoặc theo Part, hẹn giờ tự đặt; TestRunner: chia đôi màn hình, audio + phím tắt (Space, ←→, R, 1-4, ↑↓), bảng câu hỏi, đánh dấu, nộp bài | ✅ Phase 1 |
| | kết quả | Chấm điểm thang 990 (L/R), AnswerBreakdown theo Part, xem giải thích, transcript, dịch | ✅ Phase 1 |
| | `/luyen-de-toeic/tien-do` | Biểu đồ điểm + lịch sử thi | ✅ Phase 1 |
| | `/luyen-part-[1..7]-toeic` | Luyện chuyên sâu từng Part qua mọi đề | ✅ Phase 1 |
| Ngữ pháp | `/ngu-phap-toeic` `/ngu-phap-toeic/[slug]` | Chủ điểm lọc theo mức 450/600/700/800 + nhóm, tìm kiếm; bài: Bài giảng — Ví dụ — Mẹo — Bài tập — Quiz; tab Tiến độ, Lộ trình | ✅ Phase 1 |
| Nghe | `/luyen-nghe-toeic` | Nghe chép chính tả theo Part / theo đề, 4 chế độ: điền từ, nghe check, nghe chép, nghe full | ✅ Phase 2 |
| | `/luyen-nghe-song-ngu/[id]` `/luyen-nghe-tieng-anh/[id]` | Nghe song ngữ, giáo trình nghe | ✅ Phase 2 |
| Đọc | `/luyen-doc-toeic` `/luyen-doc-song-ngu/[slug]` | Part 7 song ngữ Anh–Việt theo đoạn | ✅ Phase 2 |
| Nói – Viết | `/luyen-noi-toeic/[id]` `/luyen-viet-toeic/[id]` | Đề bài, ghi âm (MediaRecorder), bài mẫu, AI chấm (tuỳ chọn) | ✅ Phase 2 |
| Từ vựng | `/tu-vung-tieng-anh` `/tu-vung-toeic/[topic]` `/1000-tu-vung-toeic-50-ngay` `/3000-tu-vung-tieng-anh-thong-dung/[level]` `/tu-vung-ielts/[level]` `/tu-vung-vstep/[level]` `/tu-vung-tieng-anh-giao-tiep/[topic]` | Bộ từ theo chủ đề, flashcard, quiz, phát âm TTS, SRS (Spaced Repetition) | ✅ Phase 1 |
| | `/vocabulary-sets` `/vocabulary-cart` | Bộ từ cá nhân, giỏ từ đã lưu | ✅ Phase 1 |
| Khoá học / Lộ trình | `/hoc-toeic-online` `/khoa-hoc-toeic` `/lo-trinh-hoc-toeic` `/lo-trinh-ngu-phap-toeic` `/lo-trinh-1000-tu` | Lộ trình 450/600/800+, bài học video/bài viết/bài tập | ✅ Phase 2 |
| Tài liệu / Blog | `/blog` `/blog/[slug]` `/tai-lieu` | Bài viết Markdown, tài liệu tải về (Supabase Storage) | ✅ Phase 2 |
| Tài khoản | `/tien-do-hoc-tap` `/account-profile` `/hop-thu` | Dashboard XP, streak, heatmap, điểm mạnh/yếu; hồ sơ; hộp thư phản hồi | ✅ Phase 1–2 |
| Khác | `/about` `/thang-diem-toeic` `/danh-gia` `/gop-y-chia-se` `/r/[code]` | Giới thiệu, bảng quy đổi điểm, đánh giá học viên, góp ý, giới thiệu bạn bè | ✅ Phase 2 |
| Báo lỗi câu hỏi | dialog trong TestRunner | Lưu `user_feedback` | ✅ Phase 1 |
| Admin | `/admin/*` | CRUD đề/câu hỏi/từ vựng/ngữ pháp/blog, import JSON/Excel, thống kê, rà soát đáp án | 🟡 Phase 3 |
| **Bỏ qua** | `/nang-cap-pro` `/quan-ly-pro` `/donate` | Thanh toán, gói Pro | ⛔ Không clone |

## 2. Mô hình dữ liệu (Supabase)

Xem `supabase/migrations/`. Các bảng chính:

- `profiles`, `user_roles` — hồ sơ, XP, streak, quyền admin
- `tests` → `question_groups` (Part, passage, transcript, ảnh, audio) → `questions` (đáp án, giải thích, dịch)
- `test_attempts` — bài làm, điểm L/R/990, đáp án JSON
- `grammar_topics`, `grammar_questions`
- `vocab_collections` → `vocab_lessons` → `vocab_lesson_words` ← `vocab_words`; `user_vocab_progress` (SRS)
- `vocabulary_sets`, `vocabulary_set_items`, `user_vocabulary_cart`
- `reading_passages` (song ngữ), `listening_lessons`, `listening_check_progress`
- `speaking_tasks`, `writing_tasks`, `practice_submissions`
- `courses`, `course_lessons`, `roadmap_stages`
- `blog_posts`, `documents`
- `study_sessions`, `user_progress`, `user_feedback`, `feedback_messages`, `student_reviews`, `referral_events`

RLS: nội dung đã xuất bản đọc công khai; dữ liệu người dùng chỉ chủ sở hữu đọc/ghi; admin ghi nội dung.

## 3. Kiến trúc

- Next.js (App Router) + TypeScript + Tailwind v4, lucide icons, Recharts cho biểu đồ.
- `@supabase/ssr` cho auth cookie; Server Components đọc nội dung, Client Components cho TestRunner/flashcard.
- Secret key chỉ dùng server-side (`SUPABASE_SECRET_KEY` trong `.env.local` và Vercel env), không commit.
- Nội dung soạn bởi subagent → `content/*.json` → `scripts/seed.mjs` đẩy vào Supabase.

## 4. Pipeline nội dung bằng subagent

| Agent | Đầu ra | Đích |
|---|---|---|
| Test Author | Đề TOEIC 7 Part gốc (transcript, câu hỏi, đáp án, giải thích, dịch) | `tests`, `question_groups`, `questions` |
| Grammar Author | Chủ điểm ngữ pháp: bài giảng, ví dụ, mẹo, bài tập, quiz | `grammar_topics`, `grammar_questions` |
| Vocab Author | Bộ từ theo chủ đề / cấp độ: IPA, nghĩa, ví dụ song ngữ | `vocab_*` |
| Reading/Listening Author | Bài đọc/nghe song ngữ theo đoạn | `reading_passages`, `listening_lessons` |
| Blog/Docs Author | Bài viết chiến lược, tài liệu | `blog_posts`, `documents` |

## 5. Tiến độ

Xem `docs/PROGRESS.md`.

## 6. Hướng phát triển

1. Sinh mp3 bằng TTS chất lượng cao + ảnh Part 1 tự tạo, lưu Supabase Storage.
2. Hỏi AI giải thích câu hỏi (Claude API qua route handler).
3. AI chấm Speaking/Writing theo rubric TOEIC.
4. Admin import Excel, rà soát đáp án, thống kê truy cập.
5. PWA offline, thông báo streak qua email.
6. Thêm IELTS / VSTEP / THPT đề thi.
