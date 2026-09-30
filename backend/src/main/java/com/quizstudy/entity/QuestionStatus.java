package com.quizstudy.entity;

/** Trạng thái duyệt của câu hỏi. Chỉ câu {@link #PUBLISHED} được đưa vào bài làm. */
public enum QuestionStatus {
    /** Chưa đủ dữ liệu, ví dụ tài liệu không có đáp án. */
    DRAFT,
    /** Có điểm nghi vấn, chờ chủ dự án quyết định (lý do ghi trong reviewNote). */
    NEEDS_REVIEW,
    /** Đã kiểm tra, dùng được trong bài làm. */
    PUBLISHED,
    /** Không dùng nữa nhưng giữ lại, vì lịch sử làm bài có thể tham chiếu tới. */
    ARCHIVED
}
