# Rà soát đáp án và tính đơn nghĩa của đề nháp — 24/11/2026

## Phạm vi và cách kiểm tra

- Đối tượng gồm 8 đề **chưa seed**, tổng cộng **350 câu MCQ**, trong `content/tests/**`. Các đề TOEIC cũ và 6 đề vocab/TOEIC đã ghi nhận seeded trong manifest nằm ngoài phạm vi chỉnh sửa.
- Reviewer đọc câu hỏi, các lựa chọn và bài đọc tiếng Anh **trước khi xem khóa đáp án**. Sau khi tự giải từng câu, đối chiếu đáp án JSON. Kết quả **350/350 trùng đáp án**, không phát hiện khóa sai. Đồng thời rà các đáp án khác có thể chấp nhận, độ rõ của tình huống, sự thống nhất với bài đọc, cấu trúc giải thích và sự hiện diện của bản dịch tiếng Việt.
- Trạng thái **PASS** ở bảng dưới là đánh giá QA nội dung bằng mô hình. Mức tin cậy **cao** là nhận định định tính của reviewer, không phải xác suất thống kê hay phê duyệt của người quản trị. `independent_review` và `admin_sample_review` trong JSON giữ `pending` để phục vụ quy trình duyệt chính thức.

## Danh sách PASS

| Tệp dưới `content/tests/` | Số câu giải và khớp đáp án | Kết quả | Tin cậy | Ghi chú |
| --- | ---: | --- | --- | --- |
| `grammar_test/qe-grammar-a2-001.json` | 40/40 | PASS | Cao | Không cần chỉnh sửa |
| `grammar_test/qe-grammar-b1-001.json` | 40/40 | PASS sau sửa | Cao | Câu 11: chủ ngữ `Neither route` để loại cách dùng động từ số nhiều đôi khi gặp với `neither of` |
| `grammar_test/qe-grammar-b2-001.json` | 40/40 | PASS | Cao | Không cần chỉnh sửa |
| `grammar_test/qe-grammar-c1-001.json` | 40/40 | PASS sau sửa | Cao | Câu 6: thay `however` bằng `whereas`, vì `however incomplete` cũng tạo một cụm nhượng bộ đúng |
| `toeic_part/qe-p5-002.json` | 40/40 | PASS sau sửa | Cao | Câu 8: thay `unless` bằng `pending`, cập nhật giải thích và bản dịch vì cả `unless` và `until` từng phù hợp ngữ cảnh |
| `vocab_test/qe-vocab-a1-002.json` | 50/50 | PASS | Cao | Không cần chỉnh sửa |
| `vocab_test/qe-vocab-b1b2-002.json` | 50/50 | PASS | Cao | Không cần chỉnh sửa |
| `thpt/qe-thpt-001.json` | 50/50 | PASS | Cao | Đối chiếu 25 câu đọc hiểu với 5 bài đọc nguồn trong đề, không cần chỉnh sửa |

## Kiểm tra phân bố và chống trùng

- Năm đề 40 câu có phân bố đáp án A/B/C/D là `10/10/10/10`. Ba đề 50 câu có phân bố `13/13/12/12`. Chuỗi cùng đáp án dài nhất là 2–3, không có lựa chọn trùng nguyên văn trong cùng câu.
- Mỗi câu có `translation` và `explanation` tiếng Việt có dấu. Tất cả tám đề có `is_published: false`, `independent_review: pending`, `admin_sample_review: pending`.
- Validator dùng SHA-1 từ câu hỏi chuẩn hóa và tập lựa chọn chuẩn hóa, không phát hiện fingerprint trùng trong **16 đề / 1.040 câu** trên đĩa. Kiểm tra bổ sung không thấy thân câu trùng hoàn toàn và không thấy cặp nào có độ tương đồng Jaccard từ vựng **≥ 0,62** sau khi bỏ từ chức năng thông dụng, khi ít nhất một câu thuộc tám đề nháp. Ngưỡng này chỉ hỗ trợ phát hiện trùng gần về mặt chữ, không thay thế đánh giá trùng nghĩa.

## Validation và giới hạn

- `node scripts/validate/validate-content.mjs --strict --no-report` với tám tệp draft cho **0 errors, 1 warning `db_skipped`**, đếm **8 đề / 350 câu**.
- `node scripts/validate/validate-content.mjs --no-report content/tests` cho **0 errors, 74 warnings** trên **16 đề / 1.040 câu**. Cảnh báo gồm `source_missing` (4), `legacy_exam_type` (4), `vietnamese` (64), `answer_balance` (1), `db_skipped` (1), chủ yếu thuộc đề cũ ngoài phạm vi sửa.
- Chưa đối chiếu fingerprint với dữ liệu đã có trên Supabase. Chưa duyệt mẫu ≥ 5% bởi admin. Đánh giá của mô hình và validator cung cấp QA nội dung để tiếp tục duyệt, chưa tương đương duyệt độc lập bởi một người kiểm tra chuyên môn.
- **Không seed, không truy cập/ghi DB, không thay đổi `docs/PROGRESS.md`, không thay đổi trạng thái xuất bản.** Chỉ ba JSON nháp nêu trên được biên tập.
