<?php

declare(strict_types=1);

/**
 * Kết nối MariaDB/MySQL bằng PDO. Cấu hình lấy từ biến môi trường (chạy thử trên máy) hoặc file config.php
 * (trên hosting). Mật khẩu chỉ nằm trong config.php, file này không đưa lên Git.
 */

/** @return array{db_host: string, db_port: int, db_name: string, db_user: string, db_password: string, admin_token: string} */
function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $file = dirname(__DIR__) . '/config.php';
    $fromFile = is_file($file) ? require $file : [];
    if (!is_file($file) && getenv('DB_NAME') === false) {
        // Hay gặp khi mới tải lên hosting: ghi rõ vào error_log để biết cần làm gì.
        error_log('[quiz-study] Chưa có api/config.php: chép api/config.example.php thành config.php rồi điền mật khẩu database.');
    }
    $config = [
        'db_host' => getenv('DB_HOST') ?: ($fromFile['db_host'] ?? 'localhost'),
        'db_port' => (int) (getenv('DB_PORT') ?: ($fromFile['db_port'] ?? 3306)),
        'db_name' => getenv('DB_NAME') ?: ($fromFile['db_name'] ?? ''),
        'db_user' => getenv('DB_USERNAME') ?: ($fromFile['db_user'] ?? ''),
        'db_password' => getenv('DB_PASSWORD') ?: ($fromFile['db_password'] ?? ''),
        // Mã cho API quản trị (migration, import), xem lib/admin.php. Để trống thì API quản trị tắt.
        'admin_token' => (string) (getenv('ADMIN_TOKEN') ?: ($fromFile['admin_token'] ?? '')),
    ];
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $config = app_config();
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $config['db_name']);
        $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Prepared statement thật của server: số nguyên đọc ra là int, không phải chuỗi.
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        // Thời gian lưu theo UTC (D-027), kể cả giá trị mặc định CURRENT_TIMESTAMP của database.
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

/** @return list<array<string, mixed>> */
function db_all(string $sql, array $params = []): array
{
    $statement = db()->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll();
}

/** @return array<string, mixed>|null */
function db_one(string $sql, array $params = []): ?array
{
    $statement = db()->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function db_execute(string $sql, array $params = []): void
{
    db()->prepare($sql)->execute($params);
}

/** "?, ?, ?" cho mệnh đề IN với số phần tử cho trước. */
function placeholders(int $count): string
{
    return implode(', ', array_fill(0, $count, '?'));
}

/**
 * Chạy $work trong một transaction. Lỗi thì rollback rồi ném tiếp.
 *
 * @template T
 * @param callable(): T $work
 * @return T
 */
function in_transaction(callable $work): mixed
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $work();
        $pdo->commit();
        return $result;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}
