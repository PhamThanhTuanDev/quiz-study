---
paths:
  - "database/**"
  - "backend-php/public/api/migrations/**"
  - "**/*.sql"
---
# Quy ước database (MySQL)

- Thiết kế chuẩn: `docs/database-design.md`. Sửa schema thì cập nhật tài liệu này trong cùng thay đổi.
- **Generic nhiều môn**: không tạo bảng/cột riêng theo môn. Môn mới chỉ là dữ liệu mới.
- InnoDB, `utf8mb4` (không ghi `COLLATE` cụ thể trong migration: hosting là MariaDB, không có `utf8mb4_0900_ai_ci`); tên bảng `snake_case` số nhiều; PK `id BIGINT AUTO_INCREMENT`; FK `<bảng_số_ít>_id`.
- Thời gian `DATETIME(6)` lưu UTC. Enum lưu `VARCHAR`.
- Thay đổi schema **chỉ qua migration** có đánh số trong `backend-php/public/api/migrations/V<n>__<mô_tả>.sql` (không sửa migration đã chạy; tạo migration mới), chạy bằng `node scripts/admin.mjs migrate` (D-056). Không sửa tay bảng trên database dev hay hosting.
- Migration phải chạy được trên cả MySQL 8 (máy dev) và MariaDB 10.5 (hosting). Mỗi câu lệnh kết thúc bằng `;` ở cuối dòng, chú thích dùng `--` đầu dòng (bộ tách câu lệnh đơn giản, xem `lib/migrations.php`).
- Luôn tạo index cho FK và cột dùng để lọc/sắp xếp thường xuyên.
- Câu hỏi đã dùng trong bài làm thì không xoá cứng, chuyển `status = ARCHIVED`.
- Không commit dữ liệu cá nhân của người dùng, dump database có mật khẩu, hay file `.env`.
- Tài khoản ứng dụng (`quiz_app`) chỉ có quyền trên database của dự án, không dùng `root`.
