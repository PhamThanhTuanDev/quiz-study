# database/

Tài nguyên hỗ trợ cho MySQL, **không** phải nơi đặt migration chính thức. Migration nằm trong backend (`backend/src/main/resources/db/migration/`, Flyway) để chạy cùng ứng dụng.

## Nội dung

| Thư mục/file | Nội dung | Phase |
|---|---|---|
| `init/01-create-database.sql` | Tạo database `quiz_study`, `quiz_study_test` và user `quiz_app`@`localhost` (chỉ có quyền trên hai database này). Mật khẩu là placeholder, **không ghi mật khẩu thật**. Chạy qua [scripts/setup-database.ps1](../scripts/setup-database.ps1), không chạy trực tiếp | 1 |
| `seed/<slug-môn>/` | (Dự kiến) File JSON câu hỏi **đã được chủ dự án duyệt**, dùng để import (ví dụ `seed/gdqp/`) | 4 |

Thư mục con chỉ được tạo khi thật sự cần, kèm giải thích.

Quy ước: [.claude/rules/database.md](../.claude/rules/database.md)
