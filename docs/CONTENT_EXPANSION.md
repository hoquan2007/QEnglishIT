# Thực thi kế hoạch dữ liệu

Đích thực hiện: `Plandataenglish.md`. Không coi danh sách headword, nội dung nháp hoặc kiểm tra tự động là dữ liệu học tập đã hoàn thiện.

## Chênh lệch đã kiểm tra

- Tổng các dòng phân bổ mục 5.1 là **315 đề mới**, không phải 335. Cộng hai đề cũ là 317; vẫn vượt mục tiêu 300.
- Database ban đầu có **1.553 bản ghi từ vựng**, trong khi các bài học tham chiếu khoảng 1.930 mục. Phải đếm lemma phân biệt sau khi chuẩn hóa.
- 28 bài nghe hiện có cộng 370 chỉ bằng 398: cần ít nhất **372 bài nghe mới** để đạt 400.
- Mục tiêu 20 đề grammar × 40 câu cần 800 câu riêng biệt; ngân hàng hiện có 574 câu, cần bổ sung trước khi sinh đủ 20 đề.
- Part 2 có ba đáp án: kiểm tra cân bằng riêng A/B/C, không áp dụng ngưỡng 22–28% của nhóm bốn đáp án.

## Quy tắc nhập và xuất bản

1. Ghi nguồn và kiểm tra license trước khi tải dữ liệu. Chỉ mục nguồn có tình trạng kiểm tra rõ ràng.
2. Biên soạn JSON, chạy validator trước mọi lần nhập. Các lỗi dữ liệu cũ được ghi báo cáo để sửa, không tự động được coi là đạt chuẩn mới.
3. Chạy dry-run để xem các lô sẽ nhập. Lệnh này không ghi DB, không cập nhật manifest thành `seeded`.
4. Chạy seed phần được chọn; báo cáo sau nhập phải lấy số liệu thực tế từ DB.
5. Đề mới mặc định nháp. Reviewer giải độc lập toàn bộ câu hỏi, sau đó admin duyệt mẫu ít nhất 5% trước khi xuất bản.
6. Audio phải được tạo và kiểm tra thực tế. Không thay URL audio bằng URL giả hoặc xem TTS trình duyệt là file đã sinh.

Không tự đăng ký gói trả phí. Khả năng tạo audio phụ thuộc engine/voice có sẵn và điều khoản của từng voice.

## Giải đề độc lập

```powershell
node scripts/qa/review-tests.mjs prepare content/tests/toeic_part/qe-p5-001.json
# Reviewer chỉ đọc file .blind.json và nộp .answers.json theo revision tương ứng.
node scripts/qa/review-tests.mjs grade content/tests/toeic_part/qe-p5-001.json content/_reviews/qe-p5-001.answers.json
```

Các file trong `content/_reviews/` không được seed như nội dung học. Kết quả khớp đáp án
không chứng minh lựa chọn nhiễu tốt hoặc bản dịch hoàn hảo; ghi chú biên tập phải được xử lý riêng.
Sửa đề làm thay đổi revision và bắt buộc giải lại. Mẫu admin được chọn ổn định từ revision,
không được đánh dấu duyệt bởi kiểm tra tự động.

## Lệnh nền tảng

```powershell
npm run content:test
npm run content:validate -- content/tests
npm run seed -- --dry-run
npm run seed -- sources
npm run seed -- tests --only qe-p5-001
npm run seed -- reading --strict --file content/reading/passages-009.json
npm run content:qa
npm run content:qa -- --db
```

Các báo cáo validator nằm trong `content/_reports/`. Xem `docs/PROGRESS.md` để biết phần nào đã được kiểm chứng và phần nào còn thiếu.

`--file` có thể lặp lại để chỉ nhập các tệp đã kiểm định. Khi chọn một tệp của đề được tách thành nhiều phần, seed sẽ nạp đầy đủ các phần của đề. Danh mục nguồn có thể chia thành nhiều tệp JSON trong `content/sources/`. Khi ghi kết quả giải độc lập vào Supabase, dùng `scripts/qa/sync-reviews.mjs --only <slug>` cho từng đề đã nạp.
