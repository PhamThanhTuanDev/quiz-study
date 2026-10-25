<?php

declare(strict_types=1);

/**
 * Trả JSON và lỗi theo đúng định dạng backend Spring Boot cũ, để frontend không phải sửa gì:
 * thành công → application/json; lỗi → Problem Details (RFC 9457), `detail` tiếng Việt.
 */

/** Lỗi có chủ đích (không tìm thấy, vi phạm luật nghiệp vụ, request sai): trả về client với status và thông điệp. */
final class HttpError extends RuntimeException
{
    /** @param array<string, mixed> $extra thuộc tính thêm của Problem Details, ví dụ `errors` */
    public function __construct(
        public readonly int $status,
        string $detail,
        public readonly array $extra = [],
        public readonly array $headers = [],
    ) {
        parent::__construct($detail);
    }

    public static function notFound(string $detail): self
    {
        return new self(404, $detail);
    }

    /** Vi phạm luật nghiệp vụ (ví dụ bài đã nộp), như BusinessRuleException ở bản Java. */
    public static function conflict(string $detail): self
    {
        return new self(409, $detail);
    }

    public static function badRequest(string $detail, array $extra = []): self
    {
        return new self(400, $detail, $extra);
    }
}

/** Phản hồi thành công có status / header riêng (ví dụ 201 Created kèm Location). */
final class JsonResponse
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly mixed $body,
        public readonly array $headers = [],
    ) {
    }
}

/** Phản hồi không phải JSON (ví dụ ảnh): hàm $send tự gửi header và nội dung. */
final class RawResponse
{
    public function __construct(public readonly Closure $send)
    {
    }
}

const STATUS_TITLES = [
    400 => 'Bad Request',
    401 => 'Unauthorized',
    404 => 'Not Found',
    405 => 'Method Not Allowed',
    409 => 'Conflict',
    415 => 'Unsupported Media Type',
    500 => 'Internal Server Error',
];

/** @param array<string, string> $headers */
function send_json(int $status, mixed $body, array $headers = [], string $contentType = 'application/json'): void
{
    http_response_code($status);
    header('Content-Type: ' . $contentType);
    // Dữ liệu làm bài luôn phải mới: không cho trình duyệt hay LiteSpeed Cache của hosting lưu đệm API.
    header('Cache-Control: no-store');
    header('X-LiteSpeed-Cache-Control: no-cache');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value);
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
}

function send_problem(int $status, string $detail, string $instance, array $extra = [], array $headers = []): void
{
    $body = [
        'title' => STATUS_TITLES[$status] ?? 'Error',
        'status' => $status,
        'detail' => $detail,
        'instance' => $instance,
    ] + $extra;
    send_json($status, $body, $headers, 'application/problem+json');
}
