package com.quizstudy.dto;

/**
 * Đúng/sai và đáp án đúng của một câu. Chỉ gửi khi được phép (D-037, D-038): luyện tập sau khi câu đã trả lời
 * (câu bị khoá); thi thử sau khi bài đã nộp hoặc hết giờ (mọi câu, kể cả câu bỏ trống).
 *
 * @param correct         người học chọn đúng hay không (bỏ trống là sai)
 * @param correctAnswerId id phương án đúng
 * @param explanation     giải thích (nếu tài liệu có), có thể NULL
 */
public record AnswerFeedbackResponse(boolean correct, Long correctAnswerId, String explanation) {
}
