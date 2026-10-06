package com.quizstudy.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.QuizResultStatus;

/**
 * Một lượt làm bài (bắt đầu, mở lại, nộp bài). Không chứa đáp án đúng, trừ phản hồi luyện tập của câu đã trả lời.
 *
 * @param id               mã lượt làm (UUID), dùng trên URL
 * @param expiresAt        hạn nộp (thi thử có giới hạn thời gian), NULL nếu không giới hạn
 * @param remainingSeconds số giây còn lại tính theo đồng hồ server (frontend đếm ngược từ đây để không phụ thuộc
 *                         giờ máy người dùng); NULL nếu không giới hạn hoặc đã kết thúc
 * @param result           kết quả chấm của thi thử đã nộp / hết giờ; NULL khi đang làm và với luyện tập
 */
public record AttemptResponse(String id, Long quizId, String quizTitle, QuizMode mode, String subjectSlug,
        String subjectName, QuizResultStatus status, Instant startedAt, Instant expiresAt, Long remainingSeconds,
        List<AttemptQuestionResponse> questions, ExamResultResponse result) {

    /**
     * Một câu trong lượt làm. Phương án đã được xáo theo lượt (cố định khi tải lại), không kèm đúng/sai.
     *
     * @param feedback luyện tập: sau khi câu đã được trả lời (D-037); thi thử: sau khi nộp / hết giờ (D-038)
     */
    public record AttemptQuestionResponse(Long questionId, int order, String content, String codeSnippet,
            List<AnswerOptionResponse> answers, Long selectedAnswerId, AnswerFeedbackResponse feedback) {
    }

    /** @param blanks câu điền khuyết: giá trị từng chỗ trống theo thứ tự (D-048); NULL với phương án thường */
    public record AnswerOptionResponse(Long id, String content, List<String> blanks) {
    }

    /**
     * Kết quả thi thử, thang 10 (D-037). Số câu sai = tổng − đúng − bỏ trống.
     *
     * @param unansweredCount số câu bỏ trống (tính là sai khi chấm)
     */
    public record ExamResultResponse(int correctCount, int unansweredCount, int totalQuestions, BigDecimal score,
            Instant submittedAt) {
    }
}
