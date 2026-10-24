# backend-php/: backend chạy trên hosting (D-054)

Viết lại API `/api/v1` của bản Spring Boot bằng PHP thuần (không framework, không thư viện ngoài), để chạy trên hosting
cPanel (LiteSpeed/Apache + PHP + MariaDB) bằng cách tải file lên File Manager. Frontend React giữ nguyên: cùng đường dẫn,
cùng JSON, cùng mã lỗi và thông điệp tiếng Việt.

```
backend-php/
├── public/              # nội dung đặt ở thư mục gốc của tên miền (cùng với frontend/dist)
│   ├── .htaccess        # SPA: đường dẫn của React Router trả index.html
│   └── api/
│       ├── .htaccess    # /api/v1/... → index.php; chặn lib/ và config.php
│       ├── index.php
│       ├── config.example.php   # chép thành config.php (không commit) rồi điền mật khẩu database
│       └── lib/         # router, kết nối DB, môn/bài/học, lượt làm bài, xáo phương án kiểu Java
└── tests/run.php        # php backend-php/tests/run.php
```

## Yêu cầu

- PHP 8.1 trở lên, có `pdo_mysql`, `mbstring`.
- MariaDB 10.5+ hoặc MySQL 8, đã có các bảng (tạo bằng Flyway của bản Java, hoặc import file SQL).
- `mod_rewrite` (LiteSpeed trên cPanel đọc được `.htaccess`).

## Đóng gói và tải lên

```powershell
node scripts/build-hosting.mjs        # → build/quiz-study-hosting.zip
```

1. cPanel → **File Manager** → thư mục gốc của tên miền (ví dụ `public_html/quiz.minlish.site`) → **Upload** file zip → **Extract**.
2. Lần đầu: trong `api/`, **Copy** `config.example.php` thành `config.php`, **Edit** điền mật khẩu database.
   Các lần cập nhật sau chỉ cần tải zip mới và giải nén đè lên: zip không chứa `config.php`, nên cấu hình được giữ nguyên.
3. Kiểm tra `https://<tên miền>/api/v1/health` → `{"status":"UP","database":"UP"}`.

Lỗi PHP được ghi vào `error_log` của hosting (dòng có `[quiz-study]`); client chỉ nhận thông báo chung.

## Khác biệt với bản Spring Boot

- Giống: mọi endpoint, luật rút câu, chấm điểm (làm tròn như `BigDecimal` HALF_UP), hết giờ (chấm "lười", cho trễ 10 giây),
  khoá dòng khi ghi (`SELECT … FOR UPDATE`), thứ tự xáo phương án (tái tạo `String.hashCode` + `java.util.Random`, nên lượt
  làm tạo từ bản Java vẫn hiện đúng thứ tự cũ).
- Chưa có: lệnh import môn từ `import.json` (vẫn dùng bản Java trên máy, `scripts/import-subject.ps1`, rồi xuất SQL lên hosting).

Kiểm chứng ngày 2026-10-24: chạy cả hai bản trên cùng database MariaDB, so sánh 175 tình huống (đọc, tạo lượt bằng bản này
đọc bằng bản kia, luyện tập, thi thử, nộp, hết giờ, lỗi): khớp hết, chỉ khác chữ trong lỗi 415 (gửi sai Content-Type).
E2E Playwright 8/8 đạt trên Apache + PHP.
