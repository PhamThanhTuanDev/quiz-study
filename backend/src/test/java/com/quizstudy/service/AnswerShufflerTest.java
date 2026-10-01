package com.quizstudy.service;

import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.entity.QuestionType.SINGLE_CHOICE;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Question;

class AnswerShufflerTest {

    @Test
    void order_isTheSameEveryTime_forTheSameAttempt() {
        Question question = questionWithAnswers(true, "A", "B", "C", "D", "E", "F");
        String attemptId = UUID.randomUUID().toString();

        assertThat(contents(AnswerShuffler.order(attemptId, question)))
                .isEqualTo(contents(AnswerShuffler.order(attemptId, question)))
                .containsExactlyInAnyOrder("A", "B", "C", "D", "E", "F");
    }

    @Test
    void order_differsBetweenAttempts() {
        Question question = questionWithAnswers(true, "A", "B", "C", "D", "E", "F");
        Set<List<String>> orders = new HashSet<>();
        for (int i = 0; i < 10; i++) {
            orders.add(contents(AnswerShuffler.order(UUID.randomUUID().toString(), question)));
        }

        assertThat(orders).as("10 lượt làm không thể cùng một thứ tự").hasSizeGreaterThan(1);
    }

    @Test
    void order_keepsTheOriginalOrder_whenShufflingIsOff() {
        Question question = questionWithAnswers(false, "Chỉ A", "Chỉ B", "Chỉ C", "Tất cả đều đúng");

        assertThat(contents(AnswerShuffler.order(UUID.randomUUID().toString(), question)))
                .containsExactly("Chỉ A", "Chỉ B", "Chỉ C", "Tất cả đều đúng");
    }

    private static Question questionWithAnswers(boolean shuffle, String... contents) {
        Question question = new Question(null, SINGLE_CHOICE, "Câu hỏi", PUBLISHED);
        question.setShuffleAnswers(shuffle);
        for (int i = 0; i < contents.length; i++) {
            question.addAnswer(contents[i], i == 0);
        }
        return question;
    }

    private static List<String> contents(List<Answer> answers) {
        return answers.stream().map(Answer::getContent).toList();
    }
}
