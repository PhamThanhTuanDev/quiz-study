<?php

declare(strict_types=1);

/**
 * API quản trị (D-056): chạy migration và import môn, thay công cụ dòng lệnh của bản Java đã bỏ.
 * Gọi bằng scripts/admin.mjs. Bảo vệ bằng mã quản trị (admin_token trong config.php, hoặc biến môi trường
 * ADMIN_TOKEN khi chạy trên máy). Chưa đặt mã (hoặc mã quá ngắn) thì API này coi như không tồn tại (404).
 */

const MIN_ADMIN_TOKEN_LENGTH = 24;

function require_admin(): void
{
    $token = app_config()['admin_token'];
    if (strlen($token) < MIN_ADMIN_TOKEN_LENGTH) {
        throw HttpError::notFound('Không tìm thấy đường dẫn này.');
    }
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    $given = str_starts_with($header, 'Bearer ') ? substr($header, 7) : '';
    if (!hash_equals($token, $given)) {
        // Chậm lại một chút để không dò được mã bằng cách thử liên tục.
        sleep(1);
        throw new HttpError(401, 'Sai mã quản trị.');
    }
}

/** POST /admin/migrate */
function admin_migrate(): array
{
    require_admin();
    try {
        return run_migrations();
    } catch (RuntimeException $error) {
        // Người gọi là quản trị (đã kiểm tra mã): cho biết migration nào lỗi để sửa, thay vì thông báo chung.
        error_log('[quiz-study] ' . $error);
        throw new HttpError(500, $error->getMessage());
    }
}

/** POST /admin/import[?replace=true]: body là nội dung file import.json của một môn. */
function admin_import(): array
{
    require_admin();
    set_time_limit(300);
    try {
        $file = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw HttpError::badRequest('Không đọc được dữ liệu gửi lên. Hãy kiểm tra định dạng JSON.');
    }
    $replace = in_array(strtolower((string) ($_GET['replace'] ?? '')), ['1', 'true', 'yes'], true);
    try {
        return import_subject($file, $replace);
    } catch (ImportError $error) {
        throw HttpError::badRequest($error->getMessage() . ', không ghi gì vào database.', ['problems' => $error->problems]);
    }
}

/**
 * GET /media/{sha256}: ảnh của phương án. Địa chỉ chứa mã băm nội dung, nên ảnh không bao giờ đổi:
 * cho trình duyệt lưu đệm lâu dài.
 */
function send_media(string $sha256): void
{
    $media = preg_match('/^[0-9a-f]{64}$/', $sha256) === 1
        ? db_one('SELECT content_type, data FROM media WHERE sha256 = ?', [$sha256])
        : null;
    if ($media === null) {
        throw HttpError::notFound('Không tìm thấy ảnh này.');
    }
    header('Content-Type: ' . $media['content_type']);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('ETag: "' . $sha256 . '"');
    // Ảnh SVG mở trực tiếp không được chạy script.
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox");
    header('X-Content-Type-Options: nosniff');
    if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === '"' . $sha256 . '"') {
        http_response_code(304);
        return;
    }
    echo $media['data'];
}
