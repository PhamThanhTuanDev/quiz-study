package com.quizstudy.dto;

/**
 * Kết quả import một môn.
 *
 * @param slug            slug của môn
 * @param chapterCount    số bài trong file
 * @param questionCount   tổng số câu trong file
 * @param publishedCount  số câu ở trạng thái PUBLISHED (dùng được trong bài làm)
 * @param updatedExisting true nếu môn đã có và được cập nhật
 * @param archivedCount   số câu không còn trong file nhưng đã có người làm, nên chuyển ARCHIVED thay vì xoá
 * @param removedCount    số câu không còn trong file và chưa ai làm, nên đã xoá
 */
public record SubjectImportResult(String slug, int chapterCount, int questionCount, int publishedCount,
        boolean updatedExisting, int archivedCount, int removedCount) {
}
