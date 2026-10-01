package com.quizstudy.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Điểm thi thử thang 10, làm tròn 2 chữ số, làm tròn nửa lên (D-037). */
public final class ScoreCalculator {

    private static final BigDecimal MAX_SCORE = BigDecimal.TEN;
    private static final int SCALE = 2;

    private ScoreCalculator() {
    }

    /**
     * @param correctCount   số câu đúng (câu bỏ trống tính là sai)
     * @param totalQuestions tổng số câu của lượt làm, phải lớn hơn 0
     */
    public static BigDecimal score(int correctCount, int totalQuestions) {
        if (totalQuestions <= 0 || correctCount < 0 || correctCount > totalQuestions) {
            throw new IllegalArgumentException(
                    "Số câu không hợp lệ: đúng " + correctCount + " trên tổng " + totalQuestions);
        }
        // Nhân trước rồi mới chia, để chỉ làm tròn một lần ở bước cuối.
        return MAX_SCORE.multiply(BigDecimal.valueOf(correctCount))
                .divide(BigDecimal.valueOf(totalQuestions), SCALE, RoundingMode.HALF_UP);
    }
}
