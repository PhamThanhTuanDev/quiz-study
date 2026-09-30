# database/

Tài nguyên hỗ trợ cho MySQL, **không** phải nơi đặt migration chính thức. Migration nằm trong backend (`backend/src/main/resources/db/migration/`, Flyway) để chạy cùng ứng dụng.

## Nội dung

| Thư mục/file | Nội dung | Commit? |
|---|---|---|
| `init/01-create-database.sql` | Tạo database `quiz_study`, `quiz_study_test` và user `quiz_app`@`localhost` (chỉ có quyền trên hai database này). Mật khẩu là placeholder; chạy qua [scripts/setup-database.ps1](../scripts/setup-database.ps1) | Có |
| `seed/<slug>/subject.json` | Cấu hình trích xuất một môn: tên môn, tên bài, số câu mong đợi, quyết định về đáp án (ví dụ G1, G2 của GDQP) | Có |
| `seed/<slug>/generated/` | Kết quả trích xuất: `import.json` (để import) và `review.md` (để duyệt). Chứa nội dung câu hỏi nên **không commit** (D-030); tạo lại bằng script trong `scripts/` | Không |

Cách trích xuất và import: [scripts/README.md](../scripts/README.md). Định dạng `import.json`: [docs/database-design.md](../docs/database-design.md#7-dữ-liệu-trung-gian-khi-import).

Quy ước: [.claude/rules/database.md](../.claude/rules/database.md)
