<?php

declare(strict_types=1);

/**
 * Thời gian tính bằng micro giây kể từ 1970 (UTC), vì cột DATETIME(6) lưu tới micro giây.
 * Database lưu giờ UTC (D-027); kết nối đặt time_zone = '+00:00' nên giá trị mặc định CURRENT_TIMESTAMP cũng là UTC.
 */

const MICROS_PER_SECOND = 1_000_000;

function now_micros(): int
{
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    return (int) $now->format('U') * MICROS_PER_SECOND + (int) $now->format('u');
}

/** '2026-10-19 15:00:16.509514' (giá trị DATETIME(6) đọc từ database) → micro giây. */
function db_to_micros(?string $value): ?int
{
    if ($value === null) {
        return null;
    }
    [$dateTime, $fraction] = array_pad(explode('.', $value, 2), 2, '0');
    $seconds = (new DateTimeImmutable($dateTime, new DateTimeZone('UTC')))->getTimestamp();
    return $seconds * MICROS_PER_SECOND + (int) str_pad(substr($fraction, 0, 6), 6, '0');
}

/** Micro giây → giá trị ghi vào cột DATETIME(6). */
function micros_to_db(?int $micros): ?string
{
    if ($micros === null) {
        return null;
    }
    return gmdate('Y-m-d H:i:s', intdiv($micros, MICROS_PER_SECOND)) . sprintf('.%06d', $micros % MICROS_PER_SECOND);
}

/**
 * Micro giây → chuỗi ISO-8601 kiểu Instant của Java ("2026-10-19T15:00:16.509514Z"): phần lẻ giây có 0, 3 hoặc
 * 6 chữ số tuỳ cần, giống hệt bản Spring Boot để frontend nhận cùng dữ liệu.
 */
function micros_to_iso(?int $micros): ?string
{
    if ($micros === null) {
        return null;
    }
    $fraction = $micros % MICROS_PER_SECOND;
    $text = gmdate('Y-m-d\TH:i:s', intdiv($micros, MICROS_PER_SECOND));
    if ($fraction === 0) {
        return $text . 'Z';
    }
    if ($fraction % 1000 === 0) {
        return $text . sprintf('.%03d', intdiv($fraction, 1000)) . 'Z';
    }
    return $text . sprintf('.%06d', $fraction) . 'Z';
}
