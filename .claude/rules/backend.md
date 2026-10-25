---
paths:
  - "backend-php/**"
---
# Quy ước backend (PHP thuần, D-054, D-056)

Backend duy nhất là `backend-php/` (bản Spring Boot đã bỏ, D-056). PHP 8.1+, không framework, không thư viện ngoài
(không Composer), để chạy được trên hosting cPanel chỉ bằng cách tải file lên.

## Cấu trúc
- `public/api/index.php`: điểm vào; `.htaccess` chuyển `/api/v1/...` vào đây và chặn `lib/`, `migrations/`, `config.php`.
- `lib/router.php`: bảng route (`METHOD đường-dẫn` → hàm) và `handle_request`, nơi duy nhất bắt lỗi và trả Problem Details.
- `lib/http.php`: `HttpError` (lỗi có mã HTTP, thông điệp tiếng Việt), `JsonResponse`, `RawResponse`, đọc JSON request.
- `lib/db.php`: cấu hình (`config.php` trên hosting, biến môi trường / `.env` trên máy) và PDO dùng chung (`db_all`, `db_one`, `db_execute`).
- Nghiệp vụ theo nhóm: `content.php` (môn, bài, chế độ Học, danh sách đề), `attempts.php` (lượt làm, chấm điểm),
  `import.php` (import môn), `migrations.php` (chạy migration), `admin.php` (API quản trị, `send_media`).
- Hàm route mỏng: đọc tham số, gọi hàm nghiệp vụ, trả mảng (thành JSON). Nghiệp vụ không đọc `$_SERVER` / `$_GET` trực tiếp.

## Quy tắc
- `declare(strict_types=1)` mọi file. Kiểu tham số / trả về đầy đủ; mảng phức tạp ghi `@return array{...}`.
- SQL luôn dùng tham số bind (`?`), **không** nối chuỗi giá trị vào SQL. Ghi nhiều bảng thì bọc trong transaction;
  sửa lượt làm thì khoá dòng (`SELECT … FOR UPDATE`).
- **Không trả `is_correct` trong API làm bài** trước khi nộp (thi thử) / trước khi kiểm tra câu (luyện tập). Chấm điểm ở server.
- JSON trả về giữ đúng tên trường camelCase mà frontend dùng (`src/types/`); đổi API thì sửa cả kiểu ở frontend và test.
- Không hard-code môn học; nhận diện môn bằng `slug`/`id` từ dữ liệu.
- Lỗi trả Problem Details (`type`, `title`, `status`, `detail`, `instance`), `detail` bằng tiếng Việt. Lỗi không lường
  trước: ghi `error_log` (tiền tố `[quiz-study]`), client chỉ nhận thông báo chung.
- Mật khẩu database, `admin_token` chỉ nằm trong `api/config.php` (không commit, không có trong zip) hoặc `.env` trên máy.
  Không log mật khẩu, mã quản trị, nội dung request nhạy cảm.
- API quản trị (`/api/v1/admin/...`) luôn gọi `require_admin()` trước khi làm gì.
- Xáo phương án dùng `java_random.php` (tái tạo `java.util.Random`): không đổi, để lượt làm cũ hiện đúng thứ tự cũ.

## Test
- `php backend-php/tests/run.php`: hàm thuần (xáo, điểm, thời gian, migration, kiểm tra file import…), không cần database.
- Luồng có database: chạy server trên máy (`php -S 127.0.0.1:8080 backend-php/dev-router.php`) và E2E
  (`cd frontend && npm run test:e2e`).
