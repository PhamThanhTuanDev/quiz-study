package com.quizstudy.dto;

import com.quizstudy.entity.QuizMode;

/**
 * Một đề của môn (GET /api/v1/subjects/{slug}/quizzes).
 *
 * @param chapterId        NULL: đề lấy câu từ cả môn
 * @param questionCount    số câu thực tế mỗi lượt: số câu của đề, hoặc ít hơn nếu phạm vi không đủ câu PUBLISHED
 * @param timeLimitMinutes NULL: không giới hạn thời gian
 */
public record QuizSummaryResponse(Long id, String title, QuizMode mode, Long chapterId, String chapterTitle,
        Integer chapterOrder, long questionCount, Integer timeLimitMinutes) {
}
