package com.quizstudy.entity;

/** Chế độ làm bài (D-037). */
public enum QuizMode {
    /** Luyện tập: trả lời câu nào biết ngay câu đó đúng/sai; không chấm điểm, không nộp bài. */
    PRACTICE,
    /** Thi thử: chỉ biết kết quả sau khi nộp; chấm điểm thang 10; có thể giới hạn thời gian. */
    EXAM
}
