<?php

declare(strict_types=1);

/**
 * Import một môn từ file JSON (định dạng: docs/database-design.md, mục 7), thay công cụ import của bản Java đã bỏ (D-056).
 * Logic giữ nguyên bản Java (SubjectImportService, SubjectContentUpdater, DefaultQuizService):
 * - Kiểm tra toàn bộ file trước; có lỗi thì liệt kê hết, không ghi gì.
 * - Ghi trong một transaction: hoặc thành công hết, hoặc không ghi gì.
 * - Bài khớp theo thứ tự (displayOrder), câu khớp theo nguồn (file + nhãn). Câu đã có người làm được cập nhật tại chỗ
 *   (giữ id câu và phương án, để lựa chọn đã lưu vẫn trỏ đúng); câu không còn trong file: chưa ai làm thì xoá,
 *   đã có người làm thì chuyển ARCHIVED.
 * - Đề mặc định: mỗi bài một đề luyện tập, cả môn một đề thi thử (chia phần nếu file khai báo subject.exam).
 * Thêm so với bản Java: loại câu (category), ảnh của phương án (answers[].image), cấu trúc đề thi thử (subject.exam).
 */

/** File import có lỗi: chứa mọi lỗi tìm được, để sửa một lần thay vì từng lỗi một. */
final class ImportError extends RuntimeException
{
    /** @param list<string> $problems */
    public function __construct(public readonly array $problems)
    {
        parent::__construct('File import không hợp lệ (' . count($problems) . ' lỗi)');
    }
}

const QUESTION_TYPES = ['SINGLE_CHOICE'];
const QUESTION_STATUSES = ['DRAFT', 'NEEDS_REVIEW', 'PUBLISHED', 'ARCHIVED'];
const MEDIA_TYPES = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
const MAX_MEDIA_BYTES = 1_000_000;
const SLUG_PATTERN = '/^[a-z0-9]+(-[a-z0-9]+)*$/';

/** Đề mặc định khi file không khai báo subject.exam (giống quiz.defaults của bản Java). */
const PRACTICE_QUESTION_COUNT = 20;
const EXAM_QUESTION_COUNT = 40;
const EXAM_TIME_LIMIT_MINUTES = 45;
const PRACTICE_TITLE_PREFIX = 'Luyện tập: ';
const EXAM_TITLE_PREFIX = 'Thi thử: ';

/**
 * @param bool $replace true: môn đã có thì cập nhật theo file; false: môn đã có thì dừng (tránh vô tình ghi đè)
 * @return array kết quả (số bài, số câu, số câu chuyển ARCHIVED / đã xoá…)
 * @throws ImportError
 */
function import_subject(array $file, bool $replace): array
{
    $problems = validate_import($file);
    if ($problems !== []) {
        throw new ImportError($problems);
    }
    return in_transaction(static function () use ($file, $replace): array {
        $data = $file['subject'];
        $existing = db_one('SELECT id, slug FROM subjects WHERE slug = ? FOR UPDATE', [$data['slug']]);
        if ($existing !== null && !$replace) {
            throw new ImportError(["Môn '{$data['slug']}' đã có trong database. Thêm --replace để thay nội dung môn này."]);
        }
        $values = [$data['name'], $data['code'] ?? null, $data['description'] ?? null, $data['displayOrder'], $data['published'] ? 1 : 0];
        if ($existing === null) {
            db_execute('INSERT INTO subjects (name, code, description, display_order, is_published, slug) VALUES (?, ?, ?, ?, ?, ?)',
                [...$values, $data['slug']]);
            $subjectId = (int) db()->lastInsertId();
        } else {
            $subjectId = (int) $existing['id'];
            db_execute('UPDATE subjects SET name = ?, code = ?, description = ?, display_order = ?, is_published = ? WHERE id = ?',
                [...$values, $subjectId]);
        }
        $content = update_content($subjectId, $file['chapters']);
        sync_default_quizzes($subjectId, $data['name'], $content['chapterIds'], $data['exam'] ?? null);
        $removedMedia = remove_unused_media();

        $questions = array_merge(...array_map(static fn (array $c): array => $c['questions'], $file['chapters']));
        return [
            'slug' => $data['slug'],
            'chapterCount' => count($file['chapters']),
            'questionCount' => count($questions),
            'publishedCount' => count(array_filter($questions, static fn (array $q): bool => $q['status'] === 'PUBLISHED')),
            'updatedExisting' => $existing !== null,
            'archivedCount' => $content['archived'],
            'removedCount' => $content['removed'],
            'removedMediaCount' => $removedMedia,
        ];
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Kiểm tra file
// ---------------------------------------------------------------------------------------------------------------

/** @return list<string> mọi lỗi tìm được, kèm vị trí trong file (ví dụ "chapters[0].questions[3].content: …") */
function validate_import(mixed $file): array
{
    $p = [];
    if (!is_array($file)) {
        return ['File phải là một đối tượng JSON'];
    }
    if (!array_key_exists('formatVersion', $file) || $file['formatVersion'] === null) {
        $p[] = 'formatVersion: thiếu formatVersion';
    } elseif ($file['formatVersion'] !== 1) {
        $p[] = 'formatVersion: chỉ hỗ trợ formatVersion = 1';
    }
    $subject = $file['subject'] ?? null;
    if (!is_array($subject)) {
        $p[] = 'subject: thiếu thông tin môn';
    } else {
        check_string($p, 'subject.slug', $subject['slug'] ?? null, 100, true);
        if (is_string($subject['slug'] ?? null) && preg_match(SLUG_PATTERN, $subject['slug']) !== 1) {
            $p[] = 'subject.slug: chỉ gồm chữ thường, số và dấu gạch ngang';
        }
        check_string($p, 'subject.name', $subject['name'] ?? null, 200, true);
        check_string($p, 'subject.code', $subject['code'] ?? null, 50, false);
        check_string($p, 'subject.description', $subject['description'] ?? null, null, false);
        check_int($p, 'subject.displayOrder', $subject['displayOrder'] ?? null);
        check_bool($p, 'subject.published', $subject['published'] ?? null);
        if (array_key_exists('exam', $subject) && $subject['exam'] !== null) {
            validate_exam($p, $subject['exam']);
        }
    }
    $chapters = $file['chapters'] ?? null;
    if (!is_array($chapters) || $chapters === [] || !array_is_list($chapters)) {
        $p[] = 'chapters: cần ít nhất một bài';
        return $p;
    }
    foreach ($chapters as $c => $chapter) {
        validate_chapter($p, "chapters[$c]", $chapter);
    }
    if ($p !== []) {
        return $p; // dữ liệu thiếu trường thì các quy tắc toàn vẹn bên dưới không kiểm tra được
    }

    // Quy tắc toàn vẹn (docs/database-design.md, mục 4.4).
    $orders = [];
    $sources = [];
    $publishedByCategory = [];
    foreach ($chapters as $c => $chapter) {
        if (isset($orders[$chapter['displayOrder']])) {
            $p[] = "chapters[$c].displayOrder: trùng thứ tự {$chapter['displayOrder']}";
        }
        $orders[$chapter['displayOrder']] = true;
        foreach ($chapter['questions'] as $q => $question) {
            $where = "chapters[$c].questions[$q] ({$question['source']['label']})";
            $correct = count(array_filter($question['answers'], static fn (array $a): bool => $a['correct'] === true));
            if (count($question['answers']) < 2) {
                $p[] = "$where: cần ít nhất 2 phương án";
            }
            if ($question['type'] === 'SINGLE_CHOICE' && $correct > 1) {
                $p[] = "$where: câu một đáp án nhưng có $correct phương án đúng";
            }
            if ($question['status'] === 'PUBLISHED' && $correct !== 1) {
                $p[] = "$where: câu PUBLISHED phải có đúng 1 phương án đúng (đang có $correct)";
            }
            // Nguồn là khoá để import lại khớp câu cũ với câu mới, nên không được trùng.
            $key = $question['source']['file'] . "\0" . $question['source']['label'];
            if (isset($sources[$key])) {
                $p[] = "$where: trùng nguồn (file + nhãn) với một câu khác";
            }
            $sources[$key] = true;
            if ($question['status'] === 'PUBLISHED' && ($question['category'] ?? null) !== null) {
                $publishedByCategory[$question['category']] = ($publishedByCategory[$question['category']] ?? 0) + 1;
            }
        }
    }
    foreach ($subject['exam']['sections'] ?? [] as $s => $section) {
        if (!isset($publishedByCategory[$section['category']])) {
            $p[] = "subject.exam.sections[$s].category: chưa có câu PUBLISHED nào thuộc loại '{$section['category']}'";
        }
    }
    return $p;
}

function validate_exam(array &$p, mixed $exam): void
{
    if (!is_array($exam)) {
        $p[] = 'subject.exam: phải là đối tượng';
        return;
    }
    check_positive_int($p, 'subject.exam.timeLimitMinutes', $exam['timeLimitMinutes'] ?? null);
    $sections = $exam['sections'] ?? null;
    if (!is_array($sections) || $sections === [] || !array_is_list($sections)) {
        $p[] = 'subject.exam.sections: cần ít nhất một phần';
        return;
    }
    $seen = [];
    foreach ($sections as $s => $section) {
        $path = "subject.exam.sections[$s]";
        if (!is_array($section)) {
            $p[] = "$path: phải là đối tượng";
            continue;
        }
        check_category($p, "$path.category", $section['category'] ?? null, true);
        check_string($p, "$path.title", $section['title'] ?? null, 255, true);
        check_positive_int($p, "$path.questionCount", $section['questionCount'] ?? null);
        if (is_string($section['category'] ?? null)) {
            if (isset($seen[$section['category']])) {
                $p[] = "$path.category: trùng loại câu với phần khác";
            }
            $seen[$section['category']] = true;
        }
    }
}

function validate_chapter(array &$p, string $path, mixed $chapter): void
{
    if (!is_array($chapter)) {
        $p[] = "$path: không được để trống";
        return;
    }
    check_string($p, "$path.code", $chapter['code'] ?? null, 50, false);
    check_string($p, "$path.title", $chapter['title'] ?? null, 255, true);
    check_int($p, "$path.displayOrder", $chapter['displayOrder'] ?? null);
    $questions = $chapter['questions'] ?? null;
    if (!is_array($questions) || !array_is_list($questions)) {
        $p[] = "$path.questions: không được để trống";
        return;
    }
    foreach ($questions as $q => $question) {
        validate_question($p, "$path.questions[$q]", $question);
    }
}

function validate_question(array &$p, string $path, mixed $question): void
{
    if (!is_array($question)) {
        $p[] = "$path: không được để trống";
        return;
    }
    if (!in_array($question['type'] ?? null, QUESTION_TYPES, true)) {
        $p[] = "$path.type: " . (isset($question['type']) ? 'không hợp lệ' : 'không được để trống');
    }
    check_string($p, "$path.content", $question['content'] ?? null, null, true);
    check_string($p, "$path.codeSnippet", $question['codeSnippet'] ?? null, null, false);
    check_string($p, "$path.explanation", $question['explanation'] ?? null, null, false);
    // Bắt buộc ghi rõ: nếu thiếu mà mặc định false thì câu bình thường sẽ không được xáo trộn.
    check_bool($p, "$path.shuffleAnswers", $question['shuffleAnswers'] ?? null);
    if (!in_array($question['status'] ?? null, QUESTION_STATUSES, true)) {
        $p[] = "$path.status: " . (isset($question['status']) ? 'không hợp lệ' : 'không được để trống');
    }
    check_string($p, "$path.reviewNote", $question['reviewNote'] ?? null, 500, false);
    if (isset($question['authored']) && !is_bool($question['authored'])) {
        $p[] = "$path.authored: phải là true hoặc false";
    }
    check_category($p, "$path.category", $question['category'] ?? null, false);
    $source = $question['source'] ?? null;
    if (!is_array($source)) {
        $p[] = "$path.source: không được để trống";
    } else {
        check_string($p, "$path.source.file", $source['file'] ?? null, 255, true);
        if (isset($source['page']) && !is_int($source['page'])) {
            $p[] = "$path.source.page: phải là số nguyên";
        }
        check_string($p, "$path.source.label", $source['label'] ?? null, 100, true);
    }
    $answers = $question['answers'] ?? null;
    if (!is_array($answers) || !array_is_list($answers)) {
        $p[] = "$path.answers: không được để trống";
        return;
    }
    foreach ($answers as $a => $answer) {
        validate_answer($p, "$path.answers[$a]", $answer);
    }
}

function validate_answer(array &$p, string $path, mixed $answer): void
{
    if (!is_array($answer)) {
        $p[] = "$path: không được để trống";
        return;
    }
    check_string($p, "$path.content", $answer['content'] ?? null, null, true);
    // Bắt buộc ghi rõ: nếu thiếu (hoặc gõ sai tên trường) mà mặc định false thì đáp án đúng sẽ mất âm thầm.
    check_bool($p, "$path.correct", $answer['correct'] ?? null);
    check_string($p, "$path.previousContent", $answer['previousContent'] ?? null, null, false);
    if (isset($answer['blanks'])) {
        if (!is_array($answer['blanks']) || !array_is_list($answer['blanks']) || $answer['blanks'] === []) {
            $p[] = "$path.blanks: nếu có thì cần ít nhất một chỗ trống";
        } else {
            foreach ($answer['blanks'] as $b => $blank) {
                if (!is_string($blank) || trim($blank) === '') {
                    $p[] = "$path.blanks[$b]: chỗ trống không được để trống";
                }
            }
        }
    }
    if (isset($answer['image'])) {
        $image = $answer['image'];
        if (!is_array($image) || !in_array($image['contentType'] ?? null, MEDIA_TYPES, true)) {
            $p[] = "$path.image.contentType: chỉ nhận " . implode(', ', MEDIA_TYPES);
        }
        $bytes = is_array($image) && is_string($image['data'] ?? null) ? base64_decode($image['data'], true) : false;
        if ($bytes === false || $bytes === '') {
            $p[] = "$path.image.data: phải là dữ liệu base64 của ảnh";
        } elseif (strlen($bytes) > MAX_MEDIA_BYTES) {
            $p[] = "$path.image.data: ảnh quá lớn (tối đa " . intdiv(MAX_MEDIA_BYTES, 1000) . ' KB)';
        }
    }
}

function check_string(array &$p, string $path, mixed $value, ?int $max, bool $required): void
{
    if ($value === null) {
        if ($required) {
            $p[] = "$path: không được để trống";
        }
        return;
    }
    if (!is_string($value)) {
        $p[] = "$path: phải là chuỗi";
    } elseif ($required && trim($value) === '') {
        $p[] = "$path: không được để trống";
    } elseif ($max !== null && mb_strlen($value) > $max) {
        $p[] = "$path: tối đa $max ký tự";
    }
}

function check_int(array &$p, string $path, mixed $value): void
{
    if (!is_int($value)) {
        $p[] = "$path: " . ($value === null ? 'không được để trống' : 'phải là số nguyên');
    }
}

function check_positive_int(array &$p, string $path, mixed $value): void
{
    if (!is_int($value) || $value <= 0) {
        $p[] = "$path: phải là số nguyên lớn hơn 0";
    }
}

function check_bool(array &$p, string $path, mixed $value): void
{
    if (!is_bool($value)) {
        $p[] = "$path: " . ($value === null ? 'không được để trống' : 'phải là true hoặc false');
    }
}

function check_category(array &$p, string $path, mixed $value, bool $required): void
{
    if ($value === null) {
        if ($required) {
            $p[] = "$path: không được để trống";
        }
    } elseif (!is_string($value) || strlen($value) > 50 || preg_match(SLUG_PATTERN, $value) !== 1) {
        $p[] = "$path: chỉ gồm chữ thường, số và dấu gạch ngang, tối đa 50 ký tự";
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Ghi bài và câu hỏi (SubjectContentUpdater của bản Java)
// ---------------------------------------------------------------------------------------------------------------

/** @return array{chapterIds: list<int>, archived: int, removed: int} */
function update_content(int $subjectId, array $chapterData): array
{
    $oldChapters = [];
    foreach (db_all('SELECT id, display_order, title FROM chapters WHERE subject_id = ? ORDER BY display_order', [$subjectId]) as $row) {
        $oldChapters[(int) $row['display_order']] = $row;
    }
    $oldQuestions = [];
    $rows = db_all(
        'SELECT q.id, q.chapter_id, q.source_file, q.source_label FROM questions q JOIN chapters c ON c.id = q.chapter_id
          WHERE c.subject_id = ? ORDER BY q.id',
        [$subjectId],
    );
    foreach ($rows as $row) {
        $oldQuestions[$row['source_file'] . "\0" . $row['source_label']] = $row;
    }
    $used = array_flip(array_map('intval', array_column(db_all(
        'SELECT DISTINCT ua.question_id FROM user_answers ua
           JOIN questions q ON q.id = ua.question_id JOIN chapters c ON c.id = q.chapter_id
          WHERE c.subject_id = ?',
        [$subjectId],
    ), 'question_id')));

    $problems = [];
    $chapterIds = [];
    $mediaIds = [];
    foreach ($chapterData as $data) {
        $chapterId = save_chapter($subjectId, $data, $oldChapters[$data['displayOrder']] ?? null);
        unset($oldChapters[$data['displayOrder']]);
        $chapterIds[] = $chapterId;
        foreach ($data['questions'] as $questionData) {
            $key = $questionData['source']['file'] . "\0" . $questionData['source']['label'];
            $existing = $oldQuestions[$key] ?? null;
            unset($oldQuestions[$key]);
            if ($existing === null) {
                insert_question($chapterId, $questionData, $mediaIds);
            } else {
                update_question($existing, $chapterId, $questionData, isset($used[(int) $existing['id']]), $problems, $mediaIds);
            }
        }
    }

    $archived = 0;
    $chaptersWithArchived = [];
    foreach ($oldQuestions as $question) {
        if (isset($used[(int) $question['id']])) {
            db_execute("UPDATE questions SET status = 'ARCHIVED' WHERE id = ?", [$question['id']]);
            $chaptersWithArchived[(int) $question['chapter_id']] = true;
            $archived++;
        } else {
            db_execute('DELETE FROM questions WHERE id = ?', [$question['id']]); // phương án xoá theo (ON DELETE CASCADE)
        }
    }
    foreach ($oldChapters as $chapter) {
        $name = "Bài thứ {$chapter['display_order']} ({$chapter['title']})";
        if (isset($chaptersWithArchived[(int) $chapter['id']])) {
            $problems[] = "$name không còn trong file nhưng có câu đã có người làm, không xoá được";
        } elseif (db_one('SELECT 1 FROM quiz_results r JOIN quizzes z ON z.id = r.quiz_id WHERE z.chapter_id = ? LIMIT 1', [$chapter['id']]) !== null) {
            $problems[] = "$name không còn trong file nhưng đề của bài đã có người làm, không xoá được";
        } else {
            db_execute('DELETE FROM quizzes WHERE chapter_id = ?', [$chapter['id']]);
            db_execute('DELETE FROM chapters WHERE id = ?', [$chapter['id']]);
        }
    }
    if ($problems !== []) {
        throw new ImportError($problems);
    }
    return ['chapterIds' => $chapterIds, 'archived' => $archived, 'removed' => count($oldQuestions) - $archived];
}

function save_chapter(int $subjectId, array $data, ?array $existing): int
{
    if ($existing === null) {
        db_execute('INSERT INTO chapters (subject_id, code, title, display_order) VALUES (?, ?, ?, ?)',
            [$subjectId, $data['code'] ?? null, $data['title'], $data['displayOrder']]);
        return (int) db()->lastInsertId();
    }
    // Thứ tự giữ nguyên vì là khoá để khớp.
    db_execute('UPDATE chapters SET code = ?, title = ? WHERE id = ?', [$data['code'] ?? null, $data['title'], $existing['id']]);
    return (int) $existing['id'];
}

/** Giá trị các cột của câu hỏi lấy từ file (dùng chung cho thêm mới và cập nhật). */
function question_values(array $data): array
{
    return [
        'category' => $data['category'] ?? null,
        'content' => $data['content'],
        'code_snippet' => $data['codeSnippet'] ?? null,
        'explanation' => $data['explanation'] ?? null,
        'shuffle_answers' => $data['shuffleAnswers'] ? 1 : 0,
        'status' => $data['status'],
        'review_note' => $data['reviewNote'] ?? null,
        'is_authored' => ($data['authored'] ?? false) === true ? 1 : 0,
        'source_file' => $data['source']['file'],
        'source_page' => $data['source']['page'] ?? null,
        'source_label' => $data['source']['label'],
    ];
}

function insert_question(int $chapterId, array $data, array &$mediaIds): void
{
    $values = ['chapter_id' => $chapterId, 'question_type' => $data['type']] + question_values($data);
    db_execute('INSERT INTO questions (' . implode(', ', array_keys($values)) . ') VALUES (' . placeholders(count($values)) . ')',
        array_values($values));
    insert_answers((int) db()->lastInsertId(), $data['answers'], $mediaIds);
}

/**
 * Cập nhật câu có sẵn. Phương án khớp theo vị trí: câu đã có người làm thì số phương án và nội dung phải giữ nguyên
 * (chỉ được đổi đáp án đúng, sửa ký tự in ấn, hoặc đổi cách viết có khai báo previousContent), vì lựa chọn đã lưu
 * trỏ tới phương án theo id.
 */
function update_question(array $question, int $chapterId, array $data, bool $used, array &$problems, array &$mediaIds): void
{
    $values = ['chapter_id' => $chapterId] + question_values($data);
    db_execute('UPDATE questions SET ' . implode(', ', array_map(static fn (string $c): string => "$c = ?", array_keys($values))) . ' WHERE id = ?',
        [...array_values($values), $question['id']]);
    $answers = db_all('SELECT id, content FROM answers WHERE question_id = ? ORDER BY display_order', [$question['id']]);
    $newAnswers = $data['answers'];
    if (count($answers) === count($newAnswers)) {
        if ($used && answers_changed($answers, $newAnswers)) {
            $problems[] = $data['source']['label'] . ': nội dung phương án đổi nhưng câu đã có người làm, chỉ được đổi đáp án đúng';
            return;
        }
        foreach ($answers as $i => $answer) {
            db_execute('UPDATE answers SET content = ?, blanks = ?, is_correct = ?, media_id = ? WHERE id = ?', [
                $newAnswers[$i]['content'],
                blanks_json($newAnswers[$i]),
                $newAnswers[$i]['correct'] ? 1 : 0,
                media_id($newAnswers[$i], $mediaIds),
                $answer['id'],
            ]);
        }
    } elseif ($used) {
        $problems[] = $data['source']['label'] . ': số phương án đổi từ ' . count($answers) . ' thành ' . count($newAnswers)
            . ' nhưng câu đã có người làm, không thay được phương án';
    } else {
        db_execute('DELETE FROM answers WHERE question_id = ?', [$question['id']]);
        insert_answers((int) $question['id'], $newAnswers, $mediaIds);
    }
}

/** Phương án giữ đúng thứ tự trong file (1 = A, 2 = B…). */
function insert_answers(int $questionId, array $answers, array &$mediaIds): void
{
    foreach ($answers as $index => $answer) {
        db_execute('INSERT INTO answers (question_id, display_order, content, blanks, is_correct, media_id) VALUES (?, ?, ?, ?, ?, ?)',
            [$questionId, $index + 1, $answer['content'], blanks_json($answer), $answer['correct'] ? 1 : 0, media_id($answer, $mediaIds)]);
    }
}

function blanks_json(array $answer): ?string
{
    return isset($answer['blanks']) ? json_encode($answer['blanks'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) : null;
}

/** Lưu ảnh của phương án (nếu có) vào bảng media, ảnh trùng nội dung chỉ lưu một lần. */
function media_id(array $answer, array &$mediaIds): ?int
{
    if (!isset($answer['image'])) {
        return null;
    }
    $bytes = base64_decode($answer['image']['data'], true);
    $sha = hash('sha256', $bytes);
    if (!isset($mediaIds[$sha])) {
        $row = db_one('SELECT id FROM media WHERE sha256 = ?', [$sha]);
        if ($row === null) {
            db_execute('INSERT INTO media (sha256, content_type, data) VALUES (?, ?, ?)', [$sha, $answer['image']['contentType'], $bytes]);
            $mediaIds[$sha] = (int) db()->lastInsertId();
        } else {
            $mediaIds[$sha] = (int) $row['id'];
        }
    }
    return $mediaIds[$sha];
}

/** Có phương án nào không còn là phương án cũ ở đúng vị trí cũ không. */
function answers_changed(array $stored, array $incoming): bool
{
    foreach ($stored as $i => $answer) {
        $current = ignoring_typography($answer['content']);
        $sameContent = $current === ignoring_typography($incoming[$i]['content']);
        $declaredOld = isset($incoming[$i]['previousContent']) && $current === ignoring_typography($incoming[$i]['previousContent']);
        if (!$sameContent && !$declaredOld) {
            return true;
        }
    }
    return false;
}

/** Bỏ qua khác biệt ký tự in ấn: nháy cong / thẳng, "–" / "-", khoảng trắng (D-043). */
function ignoring_typography(string $text): string
{
    $text = str_replace(['‘', '’', '“', '”', '–', '—'], ["'", "'", '"', '"', '-', '-'], $text);
    return trim((string) preg_replace('/\s+/u', ' ', $text));
}

function remove_unused_media(): int
{
    $statement = db()->prepare('DELETE FROM media WHERE id NOT IN (SELECT media_id FROM answers WHERE media_id IS NOT NULL)');
    $statement->execute();
    return $statement->rowCount();
}

// ---------------------------------------------------------------------------------------------------------------
// Đề mặc định (DefaultQuizService của bản Java) + các phần của đề thi thử
// ---------------------------------------------------------------------------------------------------------------

/**
 * Mỗi bài một đề luyện tập, cả môn một đề thi thử. Đề thi thử chia phần theo subject.exam nếu file có khai báo,
 * không thì rút ngẫu nhiên EXAM_QUESTION_COUNT câu trong EXAM_TIME_LIMIT_MINUTES phút như trước.
 *
 * @param list<int> $chapterIds các bài hiện có của môn, theo thứ tự trong file
 */
function sync_default_quizzes(int $subjectId, string $subjectName, array $chapterIds, ?array $exam): void
{
    $existing = db_all('SELECT id, mode, chapter_id FROM quizzes WHERE subject_id = ? ORDER BY id', [$subjectId]);
    $practiceByChapter = [];
    $examQuiz = null;
    foreach ($existing as $quiz) {
        if ($quiz['mode'] === 'PRACTICE' && $quiz['chapter_id'] !== null) {
            // Một bài có nhiều đề luyện tập (sau này có đề người dùng tạo) thì cập nhật đề đầu tiên.
            $practiceByChapter[(int) $quiz['chapter_id']] ??= (int) $quiz['id'];
        } elseif ($quiz['mode'] === 'EXAM' && $quiz['chapter_id'] === null) {
            $examQuiz ??= (int) $quiz['id'];
        }
    }
    foreach ($chapterIds as $chapterId) {
        $title = db_one('SELECT title FROM chapters WHERE id = ?', [$chapterId])['title'];
        save_quiz($practiceByChapter[$chapterId] ?? null, $subjectId, $chapterId, 'PRACTICE',
            quiz_title(PRACTICE_TITLE_PREFIX, $title), PRACTICE_QUESTION_COUNT, null);
    }
    $sections = $exam['sections'] ?? [];
    $questionCount = $sections === [] ? EXAM_QUESTION_COUNT : array_sum(array_column($sections, 'questionCount'));
    $examId = save_quiz($examQuiz, $subjectId, null, 'EXAM', quiz_title(EXAM_TITLE_PREFIX, $subjectName),
        $questionCount, $exam['timeLimitMinutes'] ?? EXAM_TIME_LIMIT_MINUTES);
    db_execute('DELETE FROM quiz_sections WHERE quiz_id = ?', [$examId]);
    foreach ($sections as $index => $section) {
        db_execute('INSERT INTO quiz_sections (quiz_id, position, title, category, question_count) VALUES (?, ?, ?, ?, ?)',
            [$examId, $index + 1, $section['title'], $section['category'], $section['questionCount']]);
    }
}

/** Cập nhật đề có sẵn, hoặc tạo mới nếu chưa có. Đề chỉ hiện khi môn được publish, nên đề mặc định luôn publish. */
function save_quiz(?int $quizId, int $subjectId, ?int $chapterId, string $mode, string $title, int $questionCount, ?int $timeLimit): int
{
    if ($quizId === null) {
        db_execute('INSERT INTO quizzes (subject_id, chapter_id, title, mode, question_count, time_limit_minutes, shuffle_questions, is_published)
                    VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE)', [$subjectId, $chapterId, $title, $mode, $questionCount, $timeLimit]);
        return (int) db()->lastInsertId();
    }
    db_execute('UPDATE quizzes SET title = ?, question_count = ?, time_limit_minutes = ?, shuffle_questions = TRUE, is_published = TRUE WHERE id = ?',
        [$title, $questionCount, $timeLimit, $quizId]);
    return $quizId;
}

/** Tên bài dài gần 255 ký tự thì cắt bớt để tên đề vẫn vừa cột quizzes.title. */
function quiz_title(string $prefix, string $name): string
{
    $full = $prefix . $name;
    return mb_strlen($full) <= 255 ? $full : mb_substr($full, 0, 254) . '…';
}
