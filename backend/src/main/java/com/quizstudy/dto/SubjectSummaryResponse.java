package com.quizstudy.dto;

/**
 * Một môn trong danh sách môn (GET /api/v1/subjects).
 *
 * @param questionCount số câu dùng được trong bài làm (trạng thái PUBLISHED)
 */
public record SubjectSummaryResponse(
        String slug, String name, String code, String description, long chapterCount, long questionCount) {
}
