package com.quizstudy.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.LongStream;

import org.junit.jupiter.api.Test;

class QuestionDrawerTest {

    private static final List<Long> CANDIDATES = LongStream.rangeClosed(1, 50).boxed().toList();

    private final QuestionDrawer drawer = new QuestionDrawer(new Random(42));

    @Test
    void draw_returnsTheRequestedNumberOfDistinctCandidates() {
        List<Long> drawn = drawer.draw(CANDIDATES, 20, true);

        assertThat(drawn).hasSize(20).doesNotHaveDuplicates();
        assertThat(CANDIDATES).containsAll(drawn);
    }

    @Test
    void draw_takesEveryCandidate_whenThereAreFewerThanRequested() {
        assertThat(drawer.draw(List.of(7L, 3L, 9L), 20, true)).containsExactlyInAnyOrder(7L, 3L, 9L);
    }

    @Test
    void draw_keepsTheOriginalOrder_whenShufflingIsOff() {
        List<Long> drawn = drawer.draw(CANDIDATES, 10, false);

        assertThat(drawn).hasSize(10).isSorted();
    }

    @Test
    void draw_picksDifferentQuestionsAcrossAttempts() {
        Set<List<Long>> draws = new HashSet<>();
        for (int i = 0; i < 5; i++) {
            draws.add(drawer.draw(CANDIDATES, 10, true));
        }

        assertThat(draws).as("5 lượt rút 10 trên 50 câu không thể trùng hết").hasSizeGreaterThan(1);
    }
}
