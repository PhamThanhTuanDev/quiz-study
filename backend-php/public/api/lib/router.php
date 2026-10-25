<?php

declare(strict_types=1);

/**
 * Bảng đường dẫn của API. `{slug}` / `{attemptId}` là chuỗi; `{quizId:long}`… phải là số nguyên (như Long ở bản
 * Java), sai kiểu thì trả 400. Đường dẫn đúng nhưng sai phương thức (ví dụ POST /subjects) thì 405.
 */
function routes(): array
{
    return [
        ['GET', 'health', static fn (): array => health()],
        ['GET', 'subjects', static fn (): array => list_subjects()],
        ['GET', 'subjects/{slug}', static fn (array $p): array => get_subject($p['slug'])],
        ['GET', 'subjects/{slug}/quizzes', static fn (array $p): array => list_quizzes($p['slug'])],
        ['GET', 'subjects/{slug}/chapters/{chapterId:long}/study',
            static fn (array $p): array => get_study_chapter($p['slug'], $p['chapterId'])],
        ['POST', 'quizzes/{quizId:long}/attempts', static function (array $p): JsonResponse {
            $attempt = start_attempt($p['quizId']);
            return new JsonResponse(201, $attempt, ['Location' => '/api/v1/attempts/' . $attempt['id']]);
        }],
        ['GET', 'attempts/{attemptId}', static fn (array $p): array => get_attempt($p['attemptId'])],
        ['PUT', 'attempts/{attemptId}/answers/{questionId:long}',
            static fn (array $p): array => save_answer($p['attemptId'], $p['questionId'], read_answer_id())],
        ['POST', 'attempts/{attemptId}/submit', static fn (array $p): array => submit_attempt($p['attemptId'])],
        ['GET', 'media/{sha256}', static fn (array $p): RawResponse => new RawResponse(static fn () => send_media($p['sha256']))],
        ['POST', 'admin/migrate', static fn (): array => admin_migrate()],
        ['POST', 'admin/import', static fn (): array => admin_import()],
    ];
}

function handle_request(string $method, string $requestUri): void
{
    $path = (string) parse_url($requestUri, PHP_URL_PATH);
    try {
        $position = strpos($path, '/api/v1/');
        $route = $position === false ? null : substr($path, $position + strlen('/api/v1/'));
        [$handler, $params] = $route === null ? [null, []] : match_route($method, $route);
        if ($handler === null) {
            throw HttpError::notFound('Không tìm thấy đường dẫn này.');
        }
        $result = $handler($params);
        if ($result instanceof RawResponse) {
            ($result->send)(); // tự gửi header và nội dung (ví dụ ảnh), không phải JSON
            return;
        }
        // Handler trả JsonResponse khi cần status khác 200 (ví dụ 201 Created), còn lại là body của 200 OK.
        $response = $result instanceof JsonResponse ? $result : new JsonResponse(200, $result);
        send_json($response->status, $response->body, $response->headers);
    } catch (HttpError $error) {
        send_problem($error->status, $error->getMessage(), $path, $error->extra, $error->headers);
    } catch (Throwable $error) {
        // Lỗi không lường trước: ghi log đầy đủ ở server (error_log của hosting), không gửi chi tiết cho client.
        error_log('[quiz-study] ' . $error);
        send_problem(500, 'Máy chủ gặp lỗi. Vui lòng thử lại sau.', $path);
    }
}

/**
 * @return array{0: ?callable, 1: array<string, int|string>}
 */
function match_route(string $method, string $route): array
{
    $segments = explode('/', $route);
    $allowed = [];
    foreach (routes() as [$routeMethod, $pattern, $handler]) {
        $params = match_pattern(explode('/', $pattern), $segments);
        if ($params === null) {
            continue;
        }
        if ($routeMethod !== $method) {
            $allowed[] = $routeMethod;
            continue;
        }
        return [$handler, convert_params($pattern, $params)];
    }
    if ($allowed !== []) {
        throw new HttpError(405, 'Đường dẫn này không hỗ trợ phương thức ' . $method . '.', [],
            ['Allow' => implode(', ', array_unique($allowed))]);
    }
    return [null, []];
}

/** @return array<string, string>|null tham số lấy từ đường dẫn (đã giải mã %xx), null nếu không khớp */
function match_pattern(array $patternSegments, array $segments): ?array
{
    if (count($patternSegments) !== count($segments)) {
        return null;
    }
    $params = [];
    foreach ($patternSegments as $index => $part) {
        $segment = $segments[$index];
        if (str_starts_with($part, '{')) {
            if ($segment === '') {
                return null;
            }
            $name = explode(':', trim($part, '{}'))[0];
            $params[$name] = rawurldecode($segment);
        } elseif ($part !== $segment) {
            return null;
        }
    }
    return $params;
}

/** Chuyển tham số kiểu long; sai kiểu thì 400 như TypeMismatchException của Spring. */
function convert_params(string $pattern, array $params): array
{
    preg_match_all('/\{(\w+):long\}/', $pattern, $matches);
    foreach ($matches[1] as $name) {
        $value = parse_long($params[$name]);
        if ($value === null) {
            throw HttpError::badRequest('Giá trị của ' . $name . ' không đúng kiểu dữ liệu.');
        }
        $params[$name] = $value;
    }
    return $params;
}

/** Như Long.parseLong của Java: có thể có dấu +/-, chỉ chữ số, trong phạm vi số nguyên 64 bit. */
function parse_long(string $text): ?int
{
    if (preg_match('/^[+-]?\d+$/', $text) !== 1) {
        return null;
    }
    $value = filter_var(preg_replace('/^([+-]?)0+(?=\d)/', '$1', $text), FILTER_VALIDATE_INT);
    return $value === false ? null : $value;
}

/**
 * Body của PUT …/answers/{questionId}: {"answerId": <số>}. Thiếu hoặc null → 400 kèm danh sách trường lỗi;
 * không phải JSON hợp lệ → 400 (giống Bean Validation và Jackson ở bản Java).
 */
function read_answer_id(): int
{
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json' && !str_ends_with($contentType, '+json')) {
        throw new HttpError(415, 'Không hỗ trợ kiểu dữ liệu ' . ($contentType === '' ? 'application/octet-stream' : $contentType) . '.');
    }
    $notReadable = 'Không đọc được dữ liệu gửi lên. Hãy kiểm tra định dạng JSON.';
    try {
        $body = json_decode((string) file_get_contents('php://input'), false, 512, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
    } catch (JsonException) {
        throw HttpError::badRequest($notReadable);
    }
    if (!$body instanceof stdClass) {
        throw HttpError::badRequest($notReadable);
    }
    $answerId = $body->answerId ?? null;
    if ($answerId === null) {
        throw HttpError::badRequest('Dữ liệu gửi lên không hợp lệ.', [
            'errors' => [['field' => 'answerId', 'message' => 'Chưa chọn phương án']],
        ]);
    }
    if (is_int($answerId)) {
        return $answerId;
    }
    // Jackson cũng nhận số dạng chuỗi ("5") và số thực không có phần lẻ (5.0).
    if (is_string($answerId) && ($parsed = parse_long($answerId)) !== null) {
        return $parsed;
    }
    if (is_float($answerId) && floor($answerId) === $answerId && abs($answerId) < 2 ** 53) {
        return (int) $answerId;
    }
    throw HttpError::badRequest($notReadable);
}

/** GET /health: trạng thái backend và kết nối database. Database lỗi thì báo DOWN (vẫn 200). */
function health(): array
{
    try {
        db()->query('SELECT 1');
        $database = 'UP';
    } catch (Throwable $error) {
        error_log('[quiz-study] Database health check failed: ' . $error->getMessage());
        $database = 'DOWN';
    }
    return ['status' => 'UP', 'database' => $database];
}
