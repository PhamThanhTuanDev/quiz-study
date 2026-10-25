<?php

declare(strict_types=1);

/**
 * Backend PHP của Quiz Study (D-054): thay bản Spring Boot, chạy trên hosting cPanel cùng database MariaDB/MySQL.
 * Giữ nguyên API /api/v1 (đường dẫn, JSON, mã lỗi, thông điệp) để frontend React không phải sửa gì.
 * Mọi request /api/v1/... được .htaccess chuyển vào file này.
 */

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    header('Content-Type: application/problem+json');
    echo json_encode(['title' => 'Internal Server Error', 'status' => 500,
        'detail' => 'Máy chủ cần PHP 8.1 trở lên (đang chạy PHP ' . PHP_VERSION . ').'], JSON_UNESCAPED_UNICODE);
    exit;
}

require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/time.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/java_random.php';
require __DIR__ . '/lib/content.php';
require __DIR__ . '/lib/attempts.php';
require __DIR__ . '/lib/migrations.php';
require __DIR__ . '/lib/import.php';
require __DIR__ . '/lib/admin.php';
require __DIR__ . '/lib/router.php';

handle_request($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
