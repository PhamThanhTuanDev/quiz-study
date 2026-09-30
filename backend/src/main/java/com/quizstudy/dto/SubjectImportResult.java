package com.quizstudy.dto;

/**
 * Kết quả import một môn.
 *
 * @param slug               slug của môn
 * @param chapterCount       số bài đã ghi
 * @param questionCount      tổng số câu đã ghi
 * @param publishedCount     số câu ở trạng thái PUBLISHED (dùng được trong bài làm)
 * @param replacedExisting   true nếu đã thay nội dung của một môn có sẵn
 */
public record SubjectImportResult(
        String slug, int chapterCount, int questionCount, int publishedCount, boolean replacedExisting) {
}
