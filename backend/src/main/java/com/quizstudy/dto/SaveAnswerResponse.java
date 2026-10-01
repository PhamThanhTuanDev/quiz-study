package com.quizstudy.dto;

/**
 * Kết quả lưu lựa chọn.
 *
 * @param feedback luyện tập: đúng/sai và đáp án đúng của câu này; thi thử: NULL (chỉ biết sau khi nộp)
 */
public record SaveAnswerResponse(Long questionId, Long selectedAnswerId, PracticeFeedbackResponse feedback) {
}
