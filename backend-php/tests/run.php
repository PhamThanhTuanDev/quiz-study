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
require __DIR__ . '/../public/api/lib/migrations.php';
require __DIR__ . '/../public/api/lib/import.php';

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

// Migration (D-056): checksum như Flyway, để database do bản Java tạo dùng tiếp được.
$migrationsDir = __DIR__ . '/../public/api/migrations';
check(flyway_checksum((string) file_get_contents("$migrationsDir/V3__add_answer_blanks.sql")) === 1026628499, 'checksum V3 bằng checksum Flyway đã ghi');
check(flyway_checksum("\xEF\xBB\xBFSELECT 1;\r\nSELECT 2;\r\n") === flyway_checksum("SELECT 1;\nSELECT 2;"), 'checksum bỏ qua BOM và kiểu xuống dòng');
check(array_keys(pending_files()) === [1, 2, 3, 4, 5], 'đủ migration V1–V5, theo thứ tự');
check(migration_description('V5__exam_sections_and_media.sql') === 'exam sections and media', 'mô tả migration như Flyway');
$v5 = split_statements((string) file_get_contents("$migrationsDir/V5__exam_sections_and_media.sql"));
check(count($v5) === 7, 'V5 có 7 câu lệnh, đang tách được ' . count($v5));
check(array_filter($v5, static fn (string $sql): bool => str_ends_with($sql, ';') || str_starts_with($sql, '--')) === [], 'câu lệnh không còn ";" và chú thích');
check(split_statements("-- chú thích\nCREATE TABLE a (\n  id INT\n);\n\nDROP TABLE b; -- xoá\n") === ["CREATE TABLE a (\n  id INT\n)", 'DROP TABLE b'], 'tách câu lệnh nhiều dòng');

// Import môn (D-056): kiểm tra file trước khi ghi.
/** File import nhỏ hợp lệ: 1 bài, 2 câu; $change sửa trên bản sao. */
function import_file(?callable $change = null): array
{
    $answer = static fn (string $content, bool $correct): array => ['content' => $content, 'correct' => $correct];
    $question = static fn (string $label, string $category): array => [
        'type' => 'SINGLE_CHOICE', 'content' => "Câu $label", 'shuffleAnswers' => true, 'status' => 'PUBLISHED',
        'category' => $category, 'source' => ['file' => 'a.pdf', 'page' => 1, 'label' => $label],
        'answers' => [$answer('Đúng', true), $answer('Sai', false)],
    ];
    $file = [
        'formatVersion' => 1,
        'subject' => [
            'slug' => 'mon-thu', 'name' => 'Môn thử', 'displayOrder' => 1, 'published' => true,
            'exam' => ['timeLimitMinutes' => 60, 'sections' => [
                ['category' => 'khai-niem', 'title' => 'Khái niệm', 'questionCount' => 1],
                ['category' => 'bieu-do', 'title' => 'Biểu đồ', 'questionCount' => 1],
            ]],
        ],
        'chapters' => [['title' => 'Bài 1', 'displayOrder' => 1, 'questions' => [$question('Câu 1', 'khai-niem'), $question('Câu 2', 'bieu-do')]]],
    ];
    if ($change !== null) {
        $change($file);
    }
    return $file;
}
check(validate_import(import_file()) === [], 'file hợp lệ: ' . implode('; ', validate_import(import_file())));
$png = base64_encode("\x89PNG\r\n\x1a\n");
check(validate_import(import_file(static function (array &$f) use ($png): void {
    $f['chapters'][0]['questions'][1]['answers'][0]['image'] = ['contentType' => 'image/png', 'data' => $png];
})) === [], 'phương án có ảnh PNG');
$problems = static fn (callable $change): string => implode(' | ', validate_import(import_file($change)));
check(str_contains($problems(static function (array &$f): void {
    $f['chapters'][0]['questions'][0]['answers'][1]['correct'] = true;
}), 'có 2 phương án đúng'), 'câu một đáp án có 2 phương án đúng');
check(str_contains($problems(static function (array &$f): void {
    unset($f['chapters'][0]['questions'][0]['answers'][0]['correct']);
}), 'answers[0].correct'), 'thiếu correct thì báo, không mặc định false');
check(str_contains($problems(static function (array &$f): void {
    $f['chapters'][0]['questions'][1]['source']['label'] = 'Câu 1';
}), 'trùng nguồn'), 'hai câu trùng nguồn');
check(str_contains($problems(static function (array &$f): void {
    $f['chapters'][0]['questions'][1]['status'] = 'NEEDS_REVIEW';
}), "chưa có câu PUBLISHED nào thuộc loại 'bieu-do'"), 'phần của đề không có câu nào');
check(str_contains($problems(static function (array &$f): void {
    $f['subject']['exam']['sections'][1]['category'] = 'khai-niem';
}), 'trùng loại câu'), 'hai phần cùng loại câu');
check(str_contains($problems(static function (array &$f): void {
    $f['chapters'][0]['questions'][0]['answers'][0]['image'] = ['contentType' => 'image/gif', 'data' => 'không phải base64'];
}), 'image.contentType'), 'ảnh sai định dạng');
check(str_contains($problems(static function (array &$f): void {
    $f['subject']['slug'] = 'Mon Thu';
}), 'subject.slug'), 'slug sai dạng');
check(validate_import('không phải đối tượng') === ['File phải là một đối tượng JSON'], 'file không phải đối tượng');

// So nội dung phương án khi import lại: bỏ qua khác biệt ký tự in ấn (D-043).
check(ignoring_typography("  “a”  –\n ‘b’ ") === '"a" - \'b\'', 'ignoring_typography');
$stored = [['content' => 'print(“x”)'], ['content' => 'cũ']];
check(!answers_changed($stored, [['content' => 'print("x")'], ['content' => 'mới', 'previousContent' => 'cũ']]), 'chỉ khác nháy cong, hoặc ghi rõ nội dung cũ: không tính là đổi');
check(answers_changed($stored, [['content' => 'print("x")'], ['content' => 'mới']]), 'đổi nội dung phương án');

echo "$checks kiểm tra, $failures lỗi\n";
exit($failures === 0 ? 0 : 1);
