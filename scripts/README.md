# scripts/

Công cụ hỗ trợ phát triển, chạy thủ công trên máy. **Không** phải một phần của web app.

## Có sẵn

| Script | Mục đích | Cách chạy |
|---|---|---|
| `setup-database.ps1` | Tạo `.env` (nếu chưa có), sinh mật khẩu cho `quiz_app`, rồi chạy [database/init/01-create-database.sql](../database/init/01-create-database.sql) bằng tài khoản `root`. MySQL tự hỏi mật khẩu root; script không lưu mật khẩu này | `powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1` (thêm `-MySqlExe "<đường dẫn>"` nếu không tìm thấy `mysql.exe`) |

## Dự kiến

| Script | Mục đích | Phase |
|---|---|---|
| Trích xuất câu hỏi từ PDF | Đọc PDF nguồn (**chỉ đọc**), sinh file JSON trung gian và danh sách câu cần duyệt | 4 |

Công cụ trích xuất (Python + PyMuPDF, hay Java + PDFBox) **chưa chốt**, xem Q-10 trong [docs/decisions.md](../docs/decisions.md).
Nguyên tắc xử lý dữ liệu nguồn: [.claude/rules/source-material.md](../.claude/rules/source-material.md).
