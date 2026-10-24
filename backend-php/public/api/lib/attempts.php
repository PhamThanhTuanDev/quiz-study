<?php

declare(strict_types=1);

/**
 * Lượt làm bài: bắt đầu, mở lại, lưu lựa chọn, nộp bài. Chấm điểm ở server (D-037), giống hệt bản Spring Boot:
 * - Luyện tập: chấm từng câu ngay khi trả lời, câu đã trả lời thì khoá; không nộp bài, không có điểm.
 * - Thi thử: lưu và đổi lựa chọn tới khi nộp; nộp (hoặc hết giờ) thì chấm cả bài, thang 10.
 * Thi thử quá hạn được chấm "lười": yêu cầu đầu tiên tới sau hạn (mở lại, lưu, nộp) sẽ chấm với các câu đã lưu
 * và chuyển sang EXPIRED. Mọi thao tác ghi khoá dòng của lượt làm (SELECT … FOR UPDATE), nên hai yêu cầu cùng lúc
 * không chen nhau. Đáp án đúng chỉ được gửi ra khi được phép (D-037, D-038).
 */

/** Cho phép trễ một chút sau hạn nộp (độ trễ mạng khi bấm lưu/nộp đúng lúc đồng hồ về 0). */
const DEADLINE_GRACE_MICROS = 10 * MICROS_PER_SECOND;

const STATUS_IN_PROGRESS = 'IN_PROGRESS';

/** POST /quizzes/{quizId}/attempts: rút câu và tạo lượt làm mới. Thời gian làm bài chỉ áp dụng cho thi thử. */
function start_attempt(int $quizId): array
{
    $quiz = db_one(
        'SELECT z.id, z.subject_id, z.chapter_id, z.mode, z.question_count, z.time_limit_minutes, z.shuffle_questions,
                z.is_published, s.is_published AS subject_published
           FROM quizzes z JOIN subjects s ON s.id = z.subject_id
          WHERE z.id = ?',
        [$quizId],
    );
    if ($quiz === null || !$quiz['is_published'] || !$quiz['subject_published']) {
        throw HttpError::notFound('Không tìm thấy đề này.');
    }
    $candidates = $quiz['chapter_id'] !== null
        ? db_all('SELECT id FROM questions WHERE chapter_id = ? AND status = ?', [$quiz['chapter_id'], USABLE_STATUS])
        : db_all(
            'SELECT q.id FROM questions q JOIN chapters c ON c.id = q.chapter_id WHERE c.subject_id = ? AND q.status = ?',
            [$quiz['subject_id'], USABLE_STATUS],
        );
    if ($candidates === []) {
        throw HttpError::conflict('Đề này chưa có câu hỏi nào để làm.');
    }
    $drawn = draw_questions(array_map('intval', array_column($candidates, 'id')), (int) $quiz['question_count'], (bool) $quiz['shuffle_questions']);

    $now = now_micros();
    $expiresAt = $quiz['mode'] === 'EXAM' && $quiz['time_limit_minutes'] !== null
        ? $now + (int) $quiz['time_limit_minutes'] * 60 * MICROS_PER_SECOND
        : null;
    $publicId = uuid_v4();
    in_transaction(static function () use ($quizId, $publicId, $drawn, $now, $expiresAt): void {
        db_execute(
            'INSERT INTO quiz_results (public_id, quiz_id, status, total_questions, started_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$publicId, $quizId, STATUS_IN_PROGRESS, count($drawn), micros_to_db($now), micros_to_db($expiresAt)],
        );
        $attemptId = (int) db()->lastInsertId();
        $values = [];
        foreach ($drawn as $index => $questionId) {
            array_push($values, $attemptId, $questionId, $index + 1);
        }
        db_execute(
            'INSERT INTO user_answers (quiz_result_id, question_id, question_order) VALUES '
                . implode(', ', array_fill(0, count($drawn), '(?, ?, ?)')),
            $values,
        );
    });
    return attempt_response(load_attempt($publicId), $now);
}

/** GET /attempts/{attemptId}: mở lại lượt làm (tải lại trang). Thi thử đã quá hạn thì được chấm và trả về kết quả. */
function get_attempt(string $publicId): array
{
    $attempt = load_attempt($publicId);
    $now = now_micros();
    if (is_overdue($attempt, $now)) {
        // Chỉ khoá dòng khi phải chấm bài quá hạn; mở lại bình thường (kể cả luyện tập) không khoá.
        in_transaction(static function () use ($publicId, $now): void {
            expire_if_overdue(load_attempt($publicId, true), $now);
        });
        $attempt = load_attempt($publicId);
    }
    return attempt_response($attempt, $now);
}

/**
 * PUT /attempts/{attemptId}/answers/{questionId}: lưu lựa chọn cho một câu.
 * Luyện tập: chấm ngay và trả phản hồi; thi thử: chỉ lưu.
 */
function save_answer(string $publicId, int $questionId, int $answerId): array
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $attempt = load_attempt($publicId, true);
        $now = now_micros();
        if (expire_if_overdue($attempt, $now)) {
            // Lưu sau hạn: giữ kết quả chấm (commit) rồi mới báo lỗi.
            $pdo->commit();
            throw HttpError::conflict('Đã hết giờ làm bài. Bài đã được chấm với các câu đã lưu.');
        }
        if ($attempt['status'] !== STATUS_IN_PROGRESS) {
            throw HttpError::conflict('Bài này đã nộp, không sửa được nữa.');
        }
        $userAnswer = null;
        foreach ($attempt['answers'] as $candidate) {
            if ($candidate['question_id'] === $questionId) {
                $userAnswer = $candidate;
                break;
            }
        }
        if ($userAnswer === null) {
            throw HttpError::notFound('Câu hỏi này không có trong lượt làm.');
        }
        $question = $attempt['questions'][$questionId];
        $chosen = null;
        foreach ($question['answers'] as $option) {
            if ($option['id'] === $answerId) {
                $chosen = $option;
                break;
            }
        }
        if ($chosen === null) {
            throw HttpError::badRequest('Phương án đã chọn không thuộc câu hỏi này.');
        }

        $feedback = null;
        if ($attempt['mode'] === 'PRACTICE') {
            if ($userAnswer['selected_answer_id'] !== null) {
                throw HttpError::conflict('Câu này đã trả lời. Ở chế độ luyện tập không đổi được đáp án.');
            }
            db_execute(
                'UPDATE user_answers SET selected_answer_id = ?, answered_at = ?, is_correct = ? WHERE id = ?',
                [$answerId, micros_to_db($now), $chosen['correct'] ? 1 : 0, $userAnswer['id']],
            );
            $feedback = feedback(['selected_answer_id' => $answerId], $question);
        } else {
            db_execute(
                'UPDATE user_answers SET selected_answer_id = ?, answered_at = ? WHERE id = ?',
                [$answerId, micros_to_db($now), $userAnswer['id']],
            );
        }
        $pdo->commit();
        return ['questionId' => $questionId, 'selectedAnswerId' => $answerId, 'feedback' => $feedback];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

/**
 * POST /attempts/{attemptId}/submit: nộp bài thi thử và chấm điểm. Nộp sau hạn (quá thời gian cho phép trễ) thì
 * vẫn chấm, trạng thái EXPIRED. Bài đã kết thúc thì trả lại kết quả đã có (nộp lại khi mất phản hồi của lần trước
 * không bị báo lỗi).
 */
function submit_attempt(string $publicId): array
{
    $now = now_micros();
    in_transaction(static function () use ($publicId, $now): void {
        $attempt = load_attempt($publicId, true);
        if ($attempt['mode'] === 'PRACTICE') {
            throw HttpError::conflict('Chế độ luyện tập không cần nộp bài.');
        }
        if ($attempt['status'] === STATUS_IN_PROGRESS && !expire_if_overdue($attempt, $now)) {
            grade($attempt, 'SUBMITTED', $now);
        }
    });
    return attempt_response(load_attempt($publicId), $now);
}

/**
 * Lượt làm kèm thông tin đề, các câu theo thứ tự và câu hỏi (đã nạp phương án).
 *
 * @param bool $forUpdate khoá dòng quiz_results tới hết transaction (chỉ khoá bảng này, không khoá đề/môn)
 */
function load_attempt(string $publicId, bool $forUpdate = false): array
{
    $attempt = db_one(
        'SELECT id, public_id, quiz_id, status, total_questions, correct_count, score, started_at, expires_at, submitted_at
           FROM quiz_results WHERE public_id = ?' . ($forUpdate ? ' FOR UPDATE' : ''),
        [$publicId],
    );
    if ($attempt === null) {
        throw HttpError::notFound('Không tìm thấy lượt làm bài này.');
    }
    $quiz = db_one(
        'SELECT z.title, z.mode, s.slug, s.name FROM quizzes z JOIN subjects s ON s.id = z.subject_id WHERE z.id = ?',
        [$attempt['quiz_id']],
    );
    $answers = db_all(
        'SELECT id, question_id, selected_answer_id, question_order FROM user_answers
          WHERE quiz_result_id = ? ORDER BY question_order',
        [$attempt['id']],
    );
    $questionIds = array_map('intval', array_column($answers, 'question_id'));
    $questions = [];
    if ($questionIds !== []) {
        $options = answers_of($questionIds);
        $rows = db_all(
            'SELECT id, content, code_snippet, explanation, shuffle_answers, is_authored FROM questions
              WHERE id IN (' . placeholders(count($questionIds)) . ')',
            $questionIds,
        );
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            $questions[$id] = $row + ['answers' => $options[$id] ?? []];
        }
    }
    return [
        'id' => (int) $attempt['id'],
        'public_id' => $attempt['public_id'],
        'quiz_id' => (int) $attempt['quiz_id'],
        'quiz_title' => $quiz['title'],
        'mode' => $quiz['mode'],
        'subject_slug' => $quiz['slug'],
        'subject_name' => $quiz['name'],
        'status' => $attempt['status'],
        'total_questions' => (int) $attempt['total_questions'],
        'correct_count' => $attempt['correct_count'] === null ? null : (int) $attempt['correct_count'],
        'score' => $attempt['score'],
        'started_at' => db_to_micros($attempt['started_at']),
        'expires_at' => db_to_micros($attempt['expires_at']),
        'submitted_at' => db_to_micros($attempt['submitted_at']),
        'answers' => array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'question_id' => (int) $row['question_id'],
            'selected_answer_id' => $row['selected_answer_id'] === null ? null : (int) $row['selected_answer_id'],
            'question_order' => (int) $row['question_order'],
        ], $answers),
        'questions' => $questions,
    ];
}

/** Thi thử đang làm mà đã quá hạn, kể cả thời gian cho phép trễ. */
function is_overdue(array $attempt, int $now): bool
{
    return $attempt['status'] === STATUS_IN_PROGRESS
        && $attempt['expires_at'] !== null
        && $now - DEADLINE_GRACE_MICROS >= $attempt['expires_at'];
}

/**
 * Chấm bài quá hạn và chuyển EXPIRED. Thời điểm kết thúc ghi là hạn nộp (bài hết giờ lúc đó),
 * không phải lúc có người mở lại bài.
 */
function expire_if_overdue(array $attempt, int $now): bool
{
    if (!is_overdue($attempt, $now)) {
        return false;
    }
    grade($attempt, 'EXPIRED', $attempt['expires_at']);
    return true;
}

/** Chấm cả bài: câu bỏ trống tính là sai; điểm thang 10. */
function grade(array $attempt, string $status, int $finishedAt): void
{
    $correct = 0;
    foreach ($attempt['answers'] as $userAnswer) {
        $isCorrect = false;
        if ($userAnswer['selected_answer_id'] !== null) {
            foreach ($attempt['questions'][$userAnswer['question_id']]['answers'] as $option) {
                if ($option['id'] === $userAnswer['selected_answer_id']) {
                    $isCorrect = $option['correct'];
                    break;
                }
            }
        }
        $correct += $isCorrect ? 1 : 0;
        db_execute('UPDATE user_answers SET is_correct = ? WHERE id = ?', [$isCorrect ? 1 : 0, $userAnswer['id']]);
    }
    db_execute(
        'UPDATE quiz_results SET status = ?, correct_count = ?, score = ?, submitted_at = ? WHERE id = ?',
        [$status, $correct, score($correct, count($attempt['answers'])), micros_to_db($finishedAt), $attempt['id']],
    );
}

/**
 * Điểm thang 10, 2 chữ số thập phân, làm tròn nửa lên (D-037). Tính bằng số nguyên (phần trăm điểm) để không
 * lệch do số thực: round_half_up(1000 * đúng / tổng).
 */
function score(int $correct, int $total): string
{
    $hundredths = intdiv(2000 * $correct + $total, 2 * $total);
    return sprintf('%d.%02d', intdiv($hundredths, 100), $hundredths % 100);
}

/** Lượt làm → JSON trả về (AttemptResponse của bản Java). */
function attempt_response(array $attempt, int $now): array
{
    $inProgress = $attempt['status'] === STATUS_IN_PROGRESS;
    $isPractice = $attempt['mode'] === 'PRACTICE';
    $questions = [];
    foreach ($attempt['answers'] as $userAnswer) {
        $question = $attempt['questions'][$userAnswer['question_id']];
        $answered = $userAnswer['selected_answer_id'] !== null;
        // Luyện tập: câu đã trả lời (đã khoá). Thi thử: bài đã nộp hoặc hết giờ (xem lại mọi câu).
        $mayReveal = $isPractice ? $answered : !$inProgress;
        $questions[] = [
            'questionId' => (int) $question['id'],
            'order' => $userAnswer['question_order'],
            'content' => $question['content'],
            'codeSnippet' => $question['code_snippet'],
            'answers' => array_map(static fn (array $option): array => [
                'id' => $option['id'],
                'content' => $option['content'],
                'blanks' => $option['blanks'],
            ], shuffled_options($attempt['public_id'], $question)),
            'selectedAnswerId' => $userAnswer['selected_answer_id'],
            'feedback' => $mayReveal ? feedback($userAnswer, $question) : null,
            'authored' => (bool) $question['is_authored'],
        ];
    }
    $result = null;
    if ($attempt['score'] !== null) {
        $unanswered = count(array_filter($attempt['answers'], static fn (array $a): bool => $a['selected_answer_id'] === null));
        $result = [
            'correctCount' => $attempt['correct_count'],
            'unansweredCount' => $unanswered,
            'totalQuestions' => $attempt['total_questions'],
            'score' => (float) $attempt['score'],
            'submittedAt' => micros_to_iso($attempt['submitted_at']),
        ];
    }
    $remaining = null;
    if ($attempt['expires_at'] !== null && $inProgress) {
        $remaining = max(0, intdiv($attempt['expires_at'] - $now, MICROS_PER_SECOND));
    }
    return [
        'id' => $attempt['public_id'],
        'quizId' => $attempt['quiz_id'],
        'quizTitle' => $attempt['quiz_title'],
        'mode' => $attempt['mode'],
        'subjectSlug' => $attempt['subject_slug'],
        'subjectName' => $attempt['subject_name'],
        'status' => $attempt['status'],
        'startedAt' => micros_to_iso($attempt['started_at']),
        'expiresAt' => micros_to_iso($attempt['expires_at']),
        'remainingSeconds' => $remaining,
        'questions' => $questions,
        'result' => $result,
    ];
}

/**
 * Đúng/sai và id phương án đúng của một câu (bỏ trống là sai). Tính theo đáp án hiện tại trong database,
 * để luôn khớp nhau kể cả khi đáp án được sửa qua import sau đó.
 */
function feedback(array $userAnswer, array $question): array
{
    $correctAnswerId = null;
    foreach ($question['answers'] as $option) {
        if ($option['correct']) {
            $correctAnswerId = $option['id'];
            break;
        }
    }
    return [
        'correct' => $userAnswer['selected_answer_id'] !== null && $userAnswer['selected_answer_id'] === $correctAnswerId,
        'correctAnswerId' => $correctAnswerId,
        'explanation' => $question['explanation'],
    ];
}

/**
 * Thứ tự phương án trong một lượt làm: xáo ngẫu nhiên nhưng cố định theo (lượt làm, câu), cùng thuật toán với
 * bản Java (xem java_random.php). Câu có shuffle_answers = FALSE (ví dụ "Tất cả đều đúng") giữ thứ tự gốc.
 */
function shuffled_options(string $publicId, array $question): array
{
    if (!$question['shuffle_answers']) {
        return $question['answers'];
    }
    $seed = java_string_hash($publicId . ':' . $question['id']);
    return java_shuffle($question['answers'], new JavaRandom($seed));
}

/**
 * Rút ngẫu nhiên các câu khác nhau. Phạm vi có ít câu hơn thì lấy hết.
 *
 * @param list<int> $candidateIds
 * @param bool $shuffleOrder false: giữ thứ tự id (thứ tự trong tài liệu)
 * @return list<int>
 */
function draw_questions(array $candidateIds, int $count, bool $shuffleOrder): array
{
    // Fisher–Yates bằng random_int (nguồn ngẫu nhiên an toàn, như SecureRandom của bản Java).
    for ($i = count($candidateIds) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$candidateIds[$i], $candidateIds[$j]] = [$candidateIds[$j], $candidateIds[$i]];
    }
    $drawn = array_slice($candidateIds, 0, min($count, count($candidateIds)));
    if (!$shuffleOrder) {
        sort($drawn);
    }
    return $drawn;
}

/** UUID phiên bản 4 (ngẫu nhiên), dạng chữ thường như UUID.randomUUID() của Java. */
function uuid_v4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0F) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3F) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}
