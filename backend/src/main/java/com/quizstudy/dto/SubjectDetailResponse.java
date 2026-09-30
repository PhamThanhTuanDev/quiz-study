package com.quizstudy.dto;

import java.util.List;

/**
 * Chi tiết một môn kèm các bài (GET /api/v1/subjects/{slug}). Không chứa câu hỏi hay đáp án.
 *
 * @param questionCount tổng số câu PUBLISHED của môn
 */
public record SubjectDetailResponse(
        String slug, String name, String code, String description, long questionCount,
        List<ChapterSummaryResponse> chapters) {
}
