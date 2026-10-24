<?php

declare(strict_types=1);

/**
 * Test của backend PHP, không cần thư viện ngoài: php backend-php/tests/run.php
 *
 * Dữ liệu mẫu trong fixtures/ được sinh bằng chính Java (String.hashCode, java.util.Random, Collections.shuffle,
 * BigDecimal) để chắc bản PHP xáo phương án và tính điểm giống hệt bản Spring Boot cũ (D-054).
 */

require __DIR__ . '/../public/api/lib/http.php';
require __DIR__ . '/../public/api/lib/time.php';
require __DIR__ . '/../public/api/lib/db.php';
require __DIR__ . '/../public/api/lib/java_random.php';
require __DIR__ . '/../public/api/lib/content.php';
require __DIR__ . '/../public/api/lib/attempts.php';
require __DIR__ . '/../public/api/lib/router.php';

$failures = 0;
$checks = 0;

function check(bool $ok, string $label): void
{
    global $failures, $checks;
    $checks++;
    if (!$ok) {
        $failures++;
        fwrite(STDERR, "FAIL: $label\n");
    }
}

// Xáo phương án giống Java: "<chuỗi>|<số phần tử>|<hashCode>|[hoán vị]"
foreach (file(__DIR__ . '/fixtures/java-shuffle.txt', FILE_IGNORE_NEW_LINES) as $line) {
    [$text, $size, $hash, $permutation] = explode('|', $line);
    $actualHash = java_string_hash($text);
    check($actualHash === (int) $hash, "hashCode($text) = $actualHash, Java: $hash");
    $actual = '[' . implode(', ', java_shuffle(range(0, (int) $size - 1), new JavaRandom($actualHash))) . ']';
    check($actual === $permutation, "shuffle($text, $size) = $actual, Java: $permutation");
}

// Điểm thang 10, làm tròn nửa lên giống BigDecimal của Java: "<đúng>/<tổng>=<điểm>"
foreach (file(__DIR__ . '/fixtures/java-score.txt', FILE_IGNORE_NEW_LINES) as $line) {
    [$fraction, $expected] = explode('=', $line);
    [$correct, $total] = array_map('intval', explode('/', $fraction));
    check(score($correct, $total) === $expected, "score($correct, $total) = " . score($correct, $total) . ", Java: $expected");
}

// Thời gian: đọc / ghi DATETIME(6) và định dạng ISO giống Instant của Java (0, 3 hoặc 6 chữ số lẻ).
$micros = db_to_micros('2026-10-19 15:00:16.509514');
check(micros_to_db($micros) === '2026-10-19 15:00:16.509514', 'DATETIME(6) đọc rồi ghi lại không đổi');
check(micros_to_iso($micros) === '2026-10-19T15:00:16.509514Z', 'ISO 6 chữ số');
check(micros_to_iso(db_to_micros('2026-10-19 15:00:16.500000')) === '2026-10-19T15:00:16.500Z', 'ISO 3 chữ số');
check(micros_to_iso(db_to_micros('2026-10-19 15:00:16.000000')) === '2026-10-19T15:00:16Z', 'ISO không có phần lẻ');

// Tham số số nguyên trên đường dẫn: như Long.parseLong
check(parse_long('024') === 24 && parse_long('+5') === 5 && parse_long('-1') === -1, 'parse_long hợp lệ');
check(parse_long('abc') === null && parse_long('1.5') === null && parse_long('99999999999999999999') === null, 'parse_long sai kiểu');

// UUID v4
check(preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', uuid_v4()) === 1, 'uuid_v4 đúng dạng');

// Rút câu: không trùng, đủ số câu, giữ thứ tự id khi không xáo
$drawn = draw_questions(range(1, 50), 20, false);
check(count($drawn) === 20 && count(array_unique($drawn)) === 20 && $drawn === array_values(array_unique($drawn)), 'rút 20 câu không trùng');
check($drawn === (static function (array $d): array { sort($d); return $d; })($drawn), 'không xáo thì giữ thứ tự id');
check(count(draw_questions([3, 1, 2], 40, true)) === 3, 'phạm vi ít câu hơn thì lấy hết');

echo "$checks kiểm tra, $failures lỗi\n";
exit($failures === 0 ? 0 : 1);
