<?php

declare(strict_types=1);

/**
 * Chạy migration của database (thay Flyway của bản Java đã bỏ, D-056). File: api/migrations/V<số>__<mô tả>.sql.
 *
 * Ghi vào bảng flyway_schema_history như Flyway (cùng cột, cùng cách tính checksum), nên database tạo bởi bản Java
 * (máy dev, hosting) dùng tiếp được: migration nào đã có trong bảng thì bỏ qua. Database trống thì tạo bảng này
 * rồi chạy từ V1.
 *
 * Mỗi file chạy lần lượt từng câu lệnh (tách ở dấu ";" cuối dòng). Lệnh đổi cấu trúc bảng (DDL) của MySQL/MariaDB
 * tự commit nên không rollback được: migration lỗi giữa chừng thì báo rõ để sửa tay, không ghi là đã chạy.
 */

const MIGRATIONS_DIR = __DIR__ . '/../migrations';

/** @return array{applied: list<string>, alreadyApplied: int} */
function run_migrations(): array
{
    ensure_history_table();
    $done = array_flip(array_map('strval', array_column(db_all('SELECT version FROM flyway_schema_history WHERE success = 1'), 'version')));
    $applied = [];
    foreach (pending_files() as $version => $file) {
        if (isset($done[$version])) {
            continue;
        }
        $started = hrtime(true);
        $sql = (string) file_get_contents($file);
        foreach (split_statements($sql) as $index => $statement) {
            try {
                db()->exec($statement);
            } catch (PDOException $error) {
                throw new RuntimeException(sprintf('Migration %s lỗi ở câu lệnh thứ %d: %s', basename($file), $index + 1, $error->getMessage()), 0, $error);
            }
        }
        $rank = (int) (db_one('SELECT COALESCE(MAX(installed_rank), 0) + 1 AS next_rank FROM flyway_schema_history')['next_rank']);
        db_execute(
            'INSERT INTO flyway_schema_history
                (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
             VALUES (?, ?, ?, \'SQL\', ?, ?, SUBSTRING_INDEX(USER(), \'@\', 1), CURRENT_TIMESTAMP, ?, 1)',
            [$rank, $version, migration_description($file), basename($file), flyway_checksum($sql), intdiv(hrtime(true) - $started, 1_000_000)],
        );
        $applied[] = basename($file);
    }
    return ['applied' => $applied, 'alreadyApplied' => count($done)];
}

/** @return array<string, string> version → đường dẫn file, theo thứ tự version tăng dần */
function pending_files(): array
{
    $files = [];
    foreach (glob(MIGRATIONS_DIR . '/V*__*.sql') ?: [] as $file) {
        if (preg_match('/^V(\d+)__/', basename($file), $match) === 1) {
            $files[$match[1]] = $file;
        }
    }
    ksort($files, SORT_NUMERIC);
    return $files;
}

function ensure_history_table(): void
{
    db()->exec(
        'CREATE TABLE IF NOT EXISTS flyway_schema_history (
            installed_rank INT NOT NULL,
            version VARCHAR(50) NULL,
            description VARCHAR(200) NOT NULL,
            type VARCHAR(20) NOT NULL,
            script VARCHAR(1000) NOT NULL,
            checksum INT NULL,
            installed_by VARCHAR(100) NOT NULL,
            installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            execution_time INT NOT NULL,
            success TINYINT(1) NOT NULL,
            CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank),
            INDEX flyway_schema_history_s_idx (success)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4'
    );
}

/** "V5__exam_sections_and_media.sql" → "exam sections and media" (cách Flyway đặt mô tả). */
function migration_description(string $file): string
{
    return str_replace('_', ' ', (string) preg_replace('/^V\d+__|\.sql$/', '', basename($file)));
}

/** Checksum như Flyway: CRC32 cập nhật theo từng dòng (bỏ ký tự xuống dòng và BOM), ép kiểu int 32 bit có dấu. */
function flyway_checksum(string $sql): int
{
    $sql = (string) preg_replace('/^\xEF\xBB\xBF/', '', $sql);
    $context = hash_init('crc32b');
    foreach (preg_split('/\r\n|\r|\n/', $sql) as $index => $line) {
        // Như BufferedReader.readLine: dòng trống cuối cùng sau ký tự xuống dòng cuối không được tính.
        hash_update($context, $line);
    }
    $value = (int) hexdec(hash_final($context));
    return $value >= 0x80000000 ? $value - 0x100000000 : $value;
}

/**
 * Tách file SQL thành từng câu lệnh: bỏ dòng chú thích "--", câu lệnh kết thúc bằng ";" ở cuối dòng.
 * Migration của dự án không có thủ tục/trigger nên cách tách đơn giản này đủ dùng.
 *
 * @return list<string>
 */
function split_statements(string $sql): array
{
    $statements = [];
    $current = '';
    foreach (preg_split('/\r\n|\r|\n/', $sql) as $line) {
        if (preg_match('/^\s*--/', $line) === 1 || trim($line) === '') {
            continue;
        }
        $current .= $line . "\n";
        if (preg_match('/;\s*(--.*)?$/', $line) === 1) {
            $statements[] = trim((string) preg_replace('/;\s*(--.*)?$/', '', trim($current)));
            $current = '';
        }
    }
    if (trim($current) !== '') {
        $statements[] = trim($current);
    }
    return $statements;
}
