package com.quizstudy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;

/**
 * Cấu hình đề mặc định, tạo khi import một môn (kế hoạch Phase 5): mỗi bài một đề luyện tập,
 * mỗi môn một đề thi thử. Giá trị đặt trong application.yml ({@code quiz.defaults.*}), chung cho mọi môn.
 *
 * @param practiceQuestionCount số câu mỗi lượt luyện tập một bài
 * @param examQuestionCount     số câu mỗi lượt thi thử cả môn
 * @param examTimeLimitMinutes  thời gian làm bài thi thử (phút)
 */
@Validated
@ConfigurationProperties(prefix = "quiz.defaults")
public record QuizDefaultsProperties(
        @Min(value = 1, message = "phải lớn hơn 0") int practiceQuestionCount,
        @Min(value = 1, message = "phải lớn hơn 0") int examQuestionCount,
        @Min(value = 1, message = "phải lớn hơn 0") int examTimeLimitMinutes) {
}
