<?php

declare(strict_types=1);

/**
 * Đọc nội dung học tập: môn, bài, đề, chế độ "Học". Chỉ môn đã publish được hiện; số câu chỉ tính câu PUBLISHED,
 * vì chỉ những câu này được dùng trong bài làm (giống bản Spring Boot).
 */

const USABLE_STATUS = 'PUBLISHED';

/** GET /subjects */
function list_subjects(): array
{
    $rows = db_all(
        'SELECT s.slug, s.name, s.code, s.description,
                (SELECT COUNT(*) FROM chapters c WHERE c.subject_id = s.id) AS chapter_count,
                (SELECT COUNT(*) FROM questions q JOIN chapters c ON c.id = q.chapter_id
                  WHERE c.subject_id = s.id AND q.status = ?) AS question_count
           FROM subjects s
          WHERE s.is_published = TRUE
          ORDER BY s.display_order, s.name',
        [USABLE_STATUS],
    );
    return array_map(static fn (array $row): array => [
        'slug' => $row['slug'],
        'name' => $row['name'],
        'code' => $row['code'],
        'description' => $row['description'],
        'chapterCount' => (int) $row['chapter_count'],
        'questionCount' => (int) $row['question_count'],
    ], $rows);
}

/** GET /subjects/{slug} */
function get_subject(string $slug): array
{
    $subject = find_published_subject($slug);
    $chapters = chapter_summaries((int) $subject['id']);
    return [
        'slug' => $subject['slug'],
        'name' => $subject['name'],
        'code' => $subject['code'],
        'description' => $subject['description'],
        'questionCount' => array_sum(array_column($chapters, 'questionCount')),
        'chapters' => $chapters,
    ];
}

/**
 * GET /subjects/{slug}/quizzes: đề cả môn đứng trước, rồi các đề theo thứ tự bài. Số câu là số câu thực tế
 * mỗi lượt (ít hơn số câu của đề nếu phạm vi không đủ câu PUBLISHED).
 */
function list_quizzes(string $slug): array
{
    $subject = find_published_subject($slug);
    $publishedPerChapter = array_column(chapter_summaries((int) $subject['id']), 'questionCount', 'id');
    $publishedInSubject = array_sum($publishedPerChapter);
    $rows = db_all(
        'SELECT z.id, z.title, z.mode, z.chapter_id, z.question_count, z.time_limit_minutes,
                c.title AS chapter_title, c.display_order AS chapter_order
           FROM quizzes z
           LEFT JOIN chapters c ON c.id = z.chapter_id
          WHERE z.subject_id = ? AND z.is_published = TRUE
          ORDER BY z.id',
        [$subject['id']],
    );
    $quizzes = array_map(static function (array $row) use ($publishedPerChapter, $publishedInSubject): array {
        $chapterId = $row['chapter_id'] === null ? null : (int) $row['chapter_id'];
        $available = $chapterId === null ? $publishedInSubject : ($publishedPerChapter[$chapterId] ?? 0);
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'mode' => $row['mode'],
            'chapterId' => $chapterId,
            'chapterTitle' => $row['chapter_title'],
            'chapterOrder' => $row['chapter_order'] === null ? null : (int) $row['chapter_order'],
            'questionCount' => min((int) $row['question_count'], $available),
            'timeLimitMinutes' => $row['time_limit_minutes'] === null ? null : (int) $row['time_limit_minutes'],
        ];
    }, $rows);
    // usort giữ nguyên thứ tự các phần tử bằng nhau (PHP 8+), như sorted() của Java: đề cả môn (null) đứng đầu.
    usort($quizzes, static fn (array $a, array $b): int =>
        ($a['chapterOrder'] === null ? PHP_INT_MIN : $a['chapterOrder']) <=> ($b['chapterOrder'] === null ? PHP_INT_MIN : $b['chapterOrder']));
    return $quizzes;
}

/**
 * GET /subjects/{slug}/chapters/{chapterId}/study (D-044): mọi câu PUBLISHED của bài kèm đáp án đúng để đọc.
 * Theo id = theo thứ tự import (thứ tự trong tài liệu); phương án giữ đúng thứ tự gốc.
 */
function get_study_chapter(string $slug, int $chapterId): array
{
    $subject = find_published_subject($slug);
    $chapter = db_one('SELECT id, code, title FROM chapters WHERE id = ? AND subject_id = ?', [$chapterId, $subject['id']]);
    if ($chapter === null) {
        throw HttpError::notFound('Không tìm thấy bài học này.');
    }
    $questions = db_all(
        'SELECT id, content, code_snippet, explanation, is_authored FROM questions
          WHERE chapter_id = ? AND status = ? ORDER BY id',
        [$chapterId, USABLE_STATUS],
    );
    $answers = answers_of(array_column($questions, 'id'));
    $items = [];
    foreach ($questions as $index => $question) {
        $items[] = [
            'questionId' => (int) $question['id'],
            'order' => $index + 1,
            'content' => $question['content'],
            'codeSnippet' => $question['code_snippet'],
            'answers' => array_map(static fn (array $answer): array => [
                'id' => $answer['id'],
                'content' => $answer['content'],
                'correct' => $answer['correct'],
                'blanks' => $answer['blanks'],
            ], $answers[(int) $question['id']] ?? []),
            'explanation' => $question['explanation'],
            // Câu soạn thêm, không có trong tài liệu nguồn (D-053): giao diện hiện nhãn "Câu tự soạn".
            'authored' => (bool) $question['is_authored'],
        ];
    }
    return [
        'subjectSlug' => $subject['slug'],
        'subjectName' => $subject['name'],
        'chapterId' => (int) $chapter['id'],
        'chapterCode' => $chapter['code'],
        'chapterTitle' => $chapter['title'],
        'questions' => $items,
    ];
}

/** @return array<string, mixed> môn đã publish; không có thì 404 */
function find_published_subject(string $slug): array
{
    $subject = db_one(
        'SELECT id, slug, name, code, description FROM subjects WHERE slug = ? AND is_published = TRUE',
        [$slug],
    );
    if ($subject === null) {
        throw HttpError::notFound('Không tìm thấy môn học này.');
    }
    return $subject;
}

/** @return list<array{id: int, code: ?string, title: string, displayOrder: int, questionCount: int}> */
function chapter_summaries(int $subjectId): array
{
    $rows = db_all(
        'SELECT c.id, c.code, c.title, c.display_order, COUNT(q.id) AS question_count
           FROM chapters c
           LEFT JOIN questions q ON q.chapter_id = c.id AND q.status = ?
          WHERE c.subject_id = ?
          GROUP BY c.id, c.code, c.title, c.display_order
          ORDER BY c.display_order',
        [USABLE_STATUS, $subjectId],
    );
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'code' => $row['code'],
        'title' => $row['title'],
        'displayOrder' => (int) $row['display_order'],
        'questionCount' => (int) $row['question_count'],
    ], $rows);
}

/**
 * Phương án của các câu, theo thứ tự gốc (display_order).
 *
 * @param list<int> $questionIds
 * @return array<int, list<array{id: int, content: string, correct: bool, blanks: ?list<string>}>> theo id câu
 */
function answers_of(array $questionIds): array
{
    if ($questionIds === []) {
        return [];
    }
    $rows = db_all(
        'SELECT id, question_id, content, blanks, is_correct FROM answers
          WHERE question_id IN (' . placeholders(count($questionIds)) . ')
          ORDER BY question_id, display_order',
        array_values($questionIds),
    );
    $byQuestion = [];
    foreach ($rows as $row) {
        $byQuestion[(int) $row['question_id']][] = [
            'id' => (int) $row['id'],
            'content' => $row['content'],
            'correct' => (bool) $row['is_correct'],
            // Cột JSON: MariaDB trả về dạng chuỗi.
            'blanks' => $row['blanks'] === null ? null : json_decode($row['blanks'], true, 512, JSON_THROW_ON_ERROR),
        ];
    }
    return $byQuestion;
}
