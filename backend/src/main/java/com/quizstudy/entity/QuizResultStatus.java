package com.quizstudy.entity;

/** Trạng thái của một lượt làm bài. */
public enum QuizResultStatus {
    /** Đang làm. Lượt luyện tập luôn ở trạng thái này vì không có nộp bài (D-037). */
    IN_PROGRESS,
    /** Thi thử đã nộp và đã chấm. */
    SUBMITTED,
    /** Thi thử hết giờ trước khi nộp; đã chấm với các câu đã lưu. */
    EXPIRED
}
