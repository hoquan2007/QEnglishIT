# Biên bản kiểm tra đề gốc QEnglishIT — 24/11/2026

## Phạm vi

Lô tác giả gồm **8 đề nháp / 350 câu MCQ nguyên bản**, chỉ ghi dữ liệu vào `content/tests/**`. Mỗi câu có đáp án, lời giải và bản dịch tiếng Việt có dấu. Không lấy nội dung từ ETS, sách đề thi, trang học tiếng Anh có bản quyền hoặc sinh câu hỏi từ ngân hàng thiếu dữ liệu. Cả tám đề giữ `is_published: false`, `independent_review: pending` và `admin_sample_review: pending`.

| Đề | Mức | Số câu | A | B | C | D |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `grammar_test/qe-grammar-a2-001.json` | A2 / 450 | 40 | 10 | 10 | 10 | 10 |
| `grammar_test/qe-grammar-b1-001.json` | B1 / 600 | 40 | 10 | 10 | 10 | 10 |
| `grammar_test/qe-grammar-b2-001.json` | B2 / 700 | 40 | 10 | 10 | 10 | 10 |
| `grammar_test/qe-grammar-c1-001.json` | C1 / 800 | 40 | 10 | 10 | 10 | 10 |
| `toeic_part/qe-p5-002.json` | B1 / 600 | 40 | 10 | 10 | 10 | 10 |
| `vocab_test/qe-vocab-a1-002.json` | A1 | 50 | 13 | 13 | 12 | 12 |
| `vocab_test/qe-vocab-b1b2-002.json` | B1–B2 | 50 | 13 | 13 | 12 | 12 |
| `thpt/qe-thpt-001.json` | B1–B2 | 50 | 13 | 13 | 12 | 12 |

## Kiểm tra đáp án và biên tập

- Một lượt giải từ **câu hỏi và phương án chưa hiển thị đáp án** đã được thực hiện với 220 câu trong năm đề đầu (`grammar-a2`, `grammar-b2`, `p5-002`, `vocab-b1b2-002`, `thpt-001`). Kết quả đối chiếu đáp án lưu trong JSON là **220/220 trùng**. Đây là kiểm tra bằng mô hình trong phiên làm việc hiện tại, chưa tính là người duyệt độc lập.
- Ba đề bổ sung (`grammar-b1`, `grammar-c1`, `vocab-a1-002`) được tác giả tự đọc soát sau khi viết và kiểm tra từng lựa chọn theo ngữ cảnh. **130 câu mới vẫn cần lượt giải độc lập mù đáp án**.
- Điều chỉnh `grammar-b2-001` câu 9 để mốc thời gian thứ Sáu trước cuộc họp thứ Hai buộc cách dùng quá khứ hoàn thành, tránh khả năng hiểu theo tương lai trong lời tường thuật.
- Điều chỉnh `thpt-001` câu 3 để việc chuẩn bị mẫu kỹ hơn dẫn đến ít lỗi hơn là quan hệ ngữ nghĩa hợp lý.
- Điều chỉnh `vocab-a1-002` câu 2 để ngữ cảnh có kem đánh răng phân biệt rõ *teeth* với *shoes*.
- Tất cả tám đề có phân bố A/B/C/D trong khoảng cho phép, không quá ba đáp án giống nhau liên tiếp, và không có hai lựa chọn trùng văn bản trong cùng câu.

## Validation

Chạy `node scripts/validate/validate-content.mjs --strict --no-report` với **đủ tám tệp mới** được **0 lỗi, 1 cảnh báo `db_skipped`**, đếm đúng **8 đề / 350 câu**. Validator cũng so fingerprint trong tập tệp được truyền cho lệnh.

Chạy `node scripts/validate/validate-content.mjs --no-report content/tests` trên toàn kho local được **0 lỗi, 74 cảnh báo**, đếm **16 đề / 1.040 câu**. Các cảnh báo hiện hữu tập trung ở tài liệu TOEIC cũ gồm `source_missing` (4), `legacy_exam_type` (4), `vietnamese` (64), `answer_balance` (1), và `db_skipped` (1). Các tệp TOEIC cũ nằm ngoài phạm vi biên tập lô này.

## Giới hạn xác minh và bước duyệt còn thiếu

- Chưa truy vấn fingerprint từ Supabase. Cảnh báo `db_skipped` có nghĩa là mới kiểm tra trùng lặp trong dữ liệu local, chưa khẳng định không trùng bản ghi đã lưu trong DB.
- Một lượt reviewer ở phiên thực sự tách biệt đã được thử khởi tạo nhưng hệ thống báo `agent thread limit reached`. Chưa có kết quả xác nhận từ reviewer tách biệt. **Giữ nguyên `independent_review: pending` và `admin_sample_review: pending` cho mọi đề**.
- Chưa có duyệt mẫu tối thiểu 5% bởi admin. Chưa seed, không cập nhật `docs/PROGRESS.md`, không công bố đề.
- Ngân hàng grammar được báo cáo có 574 câu thiếu bản dịch VI, số câu đủ điều kiện để tự sinh grammar_test là 0. Ngân hàng vocab có 1.115 câu khả dụng nhưng thiếu cân bằng ở A1/A2/C1. Lô này được **soạn mới trực tiếp**, không dựa trên giả định ngân hàng đủ nguồn để tự sinh trọn 20 đề/mỗi loại.

Để đạt mục tiêu của kế hoạch cần tiếp tục bổ sung đề gốc qua QA và hoàn thiện nguồn dữ liệu mức độ thiếu, sau đó đối chiếu fingerprint DB và duyệt độc lập trước khi xuất bản.
