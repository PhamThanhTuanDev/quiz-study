package com.quizstudy.dto;

/**
 * Một bài trong trang chi tiết môn.
 *
 * @param code          nhãn bài hiển thị được, ví dụ "Bài 1"
 * @param questionCount số câu dùng được trong bài làm (trạng thái PUBLISHED)
 */
public record ChapterSummaryResponse(long id, String code, String title, int displayOrder, long questionCount) {
}
