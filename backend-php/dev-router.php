<?php

declare(strict_types=1);

/**
 * Chạy API trên máy bằng server có sẵn của PHP (không cần Apache), cho lúc phát triển và E2E:
 *
 *     php -S 127.0.0.1:8080 backend-php/dev-router.php
 *
 * Frontend chạy riêng bằng `npm run dev` (cổng 5173) và chuyển mọi request /api sang đây. Cấu hình database và mã
 * quản trị lấy từ file .env ở thư mục gốc project (DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD, ADMIN_TOKEN);
 * biến môi trường đã đặt sẵn thì được ưu tiên. Trên hosting không dùng file này (ở đó .htaccess làm việc chuyển hướng).
 */

load_env_file(dirname(__DIR__) . '/.env');

$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (str_starts_with($path, '/api/v1/')) {
    require __DIR__ . '/public/api/index.php';
    return true;
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo "Server này chỉ phục vụ /api/v1/. Giao diện chạy bằng: cd frontend && npm run dev\n";
return true;

/** Đọc các dòng KEY=VALUE (bỏ dòng trống và dòng bắt đầu bằng #); không ghi đè biến môi trường đã có. */
function load_env_file(string $file): void
{
    if (!is_file($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (preg_match('/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/', $line, $match) !== 1) {
            continue;
        }
        $value = trim($match[2]);
        if (preg_match('/^(["\'])(.*)\1$/', $value, $quoted) === 1) {
            $value = $quoted[2];
        }
        if (getenv($match[1]) === false) {
            putenv($match[1] . '=' . $value);
        }
    }
}
