package com.quizstudy.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ScoreCalculatorTest {

    @ParameterizedTest(name = "{0}/{1} câu đúng → {2}")
    @CsvSource({
            "40, 40, 10.00",
            "0, 40, 0.00",
            "20, 40, 5.00",
            "2, 3, 6.67",   // 6.666… làm tròn lên
            "1, 3, 3.33",   // 3.333… làm tròn xuống
            "1, 8, 1.25",
            "1, 6, 1.67",
            "5, 6, 8.33"
    })
    void score_isOnAScaleOf10_roundedHalfUpToTwoDecimals(int correct, int total, String expected) {
        assertThat(ScoreCalculator.score(correct, total)).isEqualByComparingTo(expected);
        assertThat(ScoreCalculator.score(correct, total).scale()).isEqualTo(2);
    }

    @ParameterizedTest(name = "đúng {0} trên tổng {1}")
    @CsvSource({ "0, 0", "5, 4", "-1, 4" })
    void score_rejectsImpossibleCounts(int correct, int total) {
        assertThatThrownBy(() -> ScoreCalculator.score(correct, total)).isInstanceOf(IllegalArgumentException.class);
    }
}
