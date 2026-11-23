# QEnglishIT

## Công cụ trong dự án

- [Anthropic Skills](https://github.com/anthropics/skills) có 19 skill trong `.agents/skills/`. Trong Codex, gọi skill bằng tên, ví dụ `$theme-factory` hoặc `$webapp-testing`.
- [REA](https://github.com/morluto/rea) có CLI và MCP phiên bản 6.10.1. Trong Codex, dùng `$reverse-engineer-anything` cho tác vụ phân tích. Cấu hình MCP cấp dự án nằm ở `.codex/config.toml`, dùng Node cài riêng trong `tools/rea`.
- [AI Website Cloner Template](https://github.com/JCodesMore/ai-website-cloner-template) nằm trong `tools/ai-website-cloner-template`. Mở thư mục đó trong Codex và gọi `$clone-website` với URL của website bạn sở hữu hoặc có quyền tái tạo.
- [Hallmark](https://github.com/nutlope/hallmark) (v2, 50 theme) nằm trong `.agents/skills/hallmark`. Gọi `$hallmark` để thiết kế trang mới, `$hallmark redesign <path>` để thiết kế lại, hoặc `$hallmark audit <path>` để đánh giá giao diện. Nguồn cài đặt tại commit `04977e15f3dfd6ee4b74c887dac3eb52665d6c92`.

Mở phiên Codex mới trong dự án để nạp skill và cấu hình MCP.

### Chạy từ PowerShell

Từ thư mục gốc của dự án, kiểm tra REA hoặc khởi động template bằng các lệnh sau.

```powershell
npm.cmd --prefix tools/rea run rea -- mcp doctor --json
npm.cmd --prefix tools/ai-website-cloner-template run dev
```

Sau khi sao chép dự án sang máy khác, cài lại dependency và cập nhật hai đường dẫn tuyệt đối trong `.codex/config.toml` theo vị trí mới.

```powershell
npm.cmd --prefix tools/rea ci
npm.cmd --prefix tools/ai-website-cloner-template ci
```
