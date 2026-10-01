package com.quizstudy.dto;

import jakarta.validation.constraints.NotNull;

/** Lưu lựa chọn cho một câu (PUT /api/v1/attempts/{attemptId}/answers/{questionId}). */
public record SaveAnswerRequest(@NotNull(message = "Chưa chọn phương án") Long answerId) {
}
