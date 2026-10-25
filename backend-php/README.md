# backend-php/: backend của Quiz Study (D-054, D-056)

API `/api/v1` viết bằng PHP thuần (không framework, không thư viện ngoài), chạy trên hosting cPanel
(LiteSpeed/Apache + PHP + MariaDB) bằng cách tải file lên File Manager. Ban đầu là bản viết lại của backend Spring Boot,
giữ nguyên đường dẫn, JSON, mã lỗi và thông điệp tiếng Việt; bản Java nay đã bỏ (D-056), migration và import môn cũng
chạy bằng bản PHP này.

```
backend-php/
├── public/              # nội dung đặt ở thư mục gốc của tên miền (cùng với frontend/dist)
│   ├── .htaccess        # SPA: đường dẫn của React Router trả index.html
│   └── api/
│       ├── .htaccess    # /api/v1/... → index.php; chặn lib/, migrations/, config.php
│       ├── index.php
│       ├── config.example.php   # chép thành config.php (không commit) rồi điền mật khẩu database, admin_token
│       ├── migrations/  # V1__…sql, V2__…sql…: thay đổi schema, chạy bằng API quản trị
│       └── lib/         # router, DB, môn/bài/học, lượt làm bài, import, migration, API quản trị
├── dev-router.php       # chạy trên máy: php -S 127.0.0.1:8080 backend-php/dev-router.php
└── tests/run.php        # php backend-php/tests/run.php
```

## Yêu cầu

- PHP 8.1 trở lên, có `pdo_mysql`, `mbstring`.
- MariaDB 10.5+ hoặc MySQL 8.
- `mod_rewrite` (LiteSpeed trên cPanel đọc được `.htaccess`).

## Chạy trên máy

1. Có database và user (`scripts/setup-database.ps1`), file `.env` ở thư mục gốc project (mẫu: `.env.example`), trong đó
   có `ADMIN_TOKEN` (chuỗi ngẫu nhiên ≥ 24 ký tự).
2. `php -S 127.0.0.1:8080 backend-php/dev-router.php` rồi, ở cửa sổ khác, `cd frontend && npm run dev`.
3. Database mới hoặc vừa có migration mới: `node scripts/admin.mjs migrate`. Nạp môn: `node scripts/admin.mjs import <slug>`.

## API quản trị (D-056)

| Lệnh | Gọi | Việc |
|---|---|---|
| `node scripts/admin.mjs migrate` | `POST /api/v1/admin/migrate` | Chạy các file `api/migrations/V*.sql` chưa chạy |
| `node scripts/admin.mjs import <slug> [--replace]` | `POST /api/v1/admin/import[?replace=true]` | Gửi `database/seed/<slug>/generated/import.json` |

- Bảo vệ bằng `Authorization: Bearer <admin_token>`. Server chưa đặt `admin_token` (hoặc ngắn hơn 24 ký tự) thì API này
  trả 404 như không tồn tại; sai mã trả 401 sau 1 giây.
- Migration ghi vào bảng `flyway_schema_history` như Flyway của bản Java (cùng cột, cùng cách tính checksum), nên database
  đã tạo bằng bản Java dùng tiếp được: version nào đã có thì bỏ qua.
- Import kiểm tra toàn bộ file trước (lỗi thì không ghi gì và trả danh sách lỗi), rồi ghi trong một transaction.
  `--replace`: thay nội dung môn đã có; câu đã có người làm được giữ ở dạng lưu trữ (`ARCHIVED`), câu khớp nguồn được cập nhật
  tại chỗ. Ảnh của phương án lưu trong bảng `media` (khoá SHA-256), đọc qua `GET /api/v1/media/{sha256}`.

Gửi tới hosting: đặt `QUIZ_ADMIN_URL=https://<tên miền>` và `QUIZ_ADMIN_TOKEN=<admin_token của hosting>` trong `.env`
(hoặc biến môi trường của cửa sổ lệnh) rồi chạy các lệnh trên như bình thường.

## Đóng gói và tải lên hosting

```powershell
node scripts/build-hosting.mjs        # → build/quiz-study-hosting.zip
```

1. cPanel → **File Manager** → thư mục gốc của tên miền (ví dụ `public_html/quiz.minlish.site`) → **Upload** file zip → **Extract**.
2. Lần đầu: trong `api/`, **Copy** `config.example.php` thành `config.php`, **Edit** điền mật khẩu database và `admin_token`.
   Các lần cập nhật sau chỉ cần tải zip mới và giải nén đè lên: zip không chứa `config.php`, nên cấu hình được giữ nguyên.
3. Có migration mới: `node scripts/admin.mjs migrate` (với `QUIZ_ADMIN_URL` trỏ tới hosting).
4. Kiểm tra `https://<tên miền>/api/v1/health` → `{"status":"UP","database":"UP"}`.

Lỗi PHP được ghi vào `error_log` của hosting (dòng có `[quiz-study]`); client chỉ nhận thông báo chung.

## Giữ tương thích với dữ liệu do bản Java tạo

- Thứ tự xáo phương án tái tạo `String.hashCode` + `java.util.Random` + `Collections.shuffle` (`lib/java_random.php`),
  nên lượt làm tạo từ bản Java vẫn hiện đúng thứ tự cũ. Điểm làm tròn như `BigDecimal` HALF_UP. Dữ liệu mẫu trong
  `tests/fixtures/` được sinh bằng chính Java.
- Kiểm chứng ngày 2026-10-24: chạy cả hai bản trên cùng database MariaDB, so sánh 175 tình huống: khớp hết, chỉ khác chữ
  trong lỗi 415. Ngày 2026-10-25: import của bản PHP và bản Java trên database trống cho cùng dữ liệu (833 câu, 3339
  phương án, cùng ID); trường hợp `--replace` cũng khớp (câu lưu trữ / xoá, lỗi chặn import).
