package com.quizstudy.dto;

/**
 * Phản hồi cho một câu vừa trả lời ở chế độ luyện tập (D-037). Chỉ gửi sau khi câu đã được trả lời và khoá.
 *
 * @param correct         người học chọn đúng hay sai
 * @param correctAnswerId id phương án đúng
 * @param explanation     giải thích (nếu tài liệu có), có thể NULL
 */
public record PracticeFeedbackResponse(boolean correct, Long correctAnswerId, String explanation) {
}
