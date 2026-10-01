package com.quizstudy.service;

import static com.quizstudy.entity.QuestionStatus.NEEDS_REVIEW;
import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.testsupport.QuizFixture.correctAnswer;
import static com.quizstudy.testsupport.QuizFixture.wrongAnswer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.AttemptResponse;
import com.quizstudy.dto.AttemptResponse.AnswerOptionResponse;
import com.quizstudy.dto.AttemptResponse.AttemptQuestionResponse;
import com.quizstudy.dto.SaveAnswerResponse;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.QuizResultStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.BusinessRuleException;
import com.quizstudy.exception.InvalidRequestException;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.testsupport.MutableClock;
import com.quizstudy.testsupport.QuizFixture;

import jakarta.persistence.EntityManager;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttemptServiceTest {

    private static final Instant START = Instant.parse("2026-10-01T03:00:00Z");
    private static final Duration EXAM_TIME = Duration.ofMinutes(45);

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(START);
        }
    }

    @Autowired
    private AttemptService attemptService;

    @Autowired
    private MutableClock clock;

    @Autowired
    private EntityManager entityManager;

    private QuizFixture fixture;
    private final Map<Long, Question> published = new LinkedHashMap<>();
    private Question needsReview;
    private Long practiceQuizId;
    private Long examQuizId;
    private Long emptyQuizId;

    @BeforeEach
    void createQuizzes() {
        clock.reset(START);
        fixture = new QuizFixture(entityManager);
        Subject subject = fixture.subject("mon-lam-bai", true);
        Chapter chapter = fixture.chapter(subject, "Bài 1", 1);
        Chapter emptyChapter = fixture.chapter(subject, "Bài chưa có câu", 2);
        for (int i = 0; i < 5; i++) {
            Question question = fixture.question(chapter, "Câu " + (i + 1), PUBLISHED, i % 4);
            published.put(question.getId(), question);
        }
        needsReview = fixture.question(chapter, "Câu chờ duyệt", NEEDS_REVIEW, 0);
        practiceQuizId = fixture.quiz(subject, chapter, QuizMode.PRACTICE, 3, null).getId();
        examQuizId = fixture.quiz(subject, null, QuizMode.EXAM, 10, 45).getId();
        emptyQuizId = fixture.quiz(subject, emptyChapter, QuizMode.PRACTICE, 20, null).getId();
        entityManager.flush();
    }

    @Test
    void start_practice_drawsDistinctPublishedQuestionsOfTheChapter_upToTheQuizCount() {
        AttemptResponse attempt = attemptService.start(practiceQuizId);

        assertThat(attempt.mode()).isEqualTo(QuizMode.PRACTICE);
        assertThat(attempt.status()).isEqualTo(QuizResultStatus.IN_PROGRESS);
        assertThat(attempt.expiresAt()).isNull();
        assertThat(attempt.remainingSeconds()).isNull();
        assertThat(attempt.result()).isNull();
        assertThat(questionIds(attempt)).hasSize(3).doesNotHaveDuplicates();
        assertThat(published.keySet()).containsAll(questionIds(attempt));
        assertThat(attempt.questions()).extracting(AttemptQuestionResponse::order).containsExactly(1, 2, 3);
        assertThat(attempt.questions()).allSatisfy(question -> {
            assertThat(question.answers()).hasSize(4);
            assertThat(question.selectedAnswerId()).isNull();
            assertThat(question.feedback()).isNull();
        });
    }

    @Test
    void start_exam_takesEveryPublishedQuestion_whenThereAreFewerThanTheQuizCount_andSetsTheDeadline() {
        AttemptResponse attempt = attemptService.start(examQuizId);

        assertThat(questionIds(attempt)).containsExactlyInAnyOrderElementsOf(published.keySet());
        assertThat(attempt.startedAt()).isEqualTo(START);
        assertThat(attempt.expiresAt()).isEqualTo(START.plus(EXAM_TIME));
        assertThat(attempt.remainingSeconds()).isEqualTo(EXAM_TIME.toSeconds());
    }

    @Test
    void start_rejectsAQuizWhoseChapterHasNoPublishedQuestion() {
        assertThatThrownBy(() -> attemptService.start(emptyQuizId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Đề này chưa có câu hỏi nào để làm.");
    }

    @Test
    void start_rejectsAnUnknownQuiz_andAQuizOfAnUnpublishedSubject() {
        Subject hidden = fixture.subject("mon-an", false);
        Chapter chapter = fixture.chapter(hidden, "Bài 1", 1);
        fixture.question(chapter, "Câu", PUBLISHED, 0);
        Long hiddenQuizId = fixture.quiz(hidden, chapter, QuizMode.PRACTICE, 5, null).getId();

        assertThatThrownBy(() -> attemptService.start(hiddenQuizId)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> attemptService.start(-1L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void get_returnsTheSameQuestionsAndAnswerOrder_afterAReload() {
        AttemptResponse started = attemptService.start(examQuizId);
        flushAndClear();

        AttemptResponse reloaded = attemptService.get(started.id());

        assertThat(questionIds(reloaded)).isEqualTo(questionIds(started));
        assertThat(optionIds(reloaded)).isEqualTo(optionIds(started));
    }

    @Test
    void get_rejectsAnUnknownAttempt() {
        assertThatThrownBy(() -> attemptService.get("khong-co")).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void practice_saveAnswer_returnsFeedbackForThatQuestion_andLocksIt() {
        AttemptResponse attempt = attemptService.start(practiceQuizId);
        Question question = published.get(attempt.questions().getFirst().questionId());

        SaveAnswerResponse saved = attemptService.saveAnswer(attempt.id(), question.getId(),
                wrongAnswer(question).getId());

        assertThat(saved.feedback()).isNotNull();
        assertThat(saved.feedback().correct()).isFalse();
        assertThat(saved.feedback().correctAnswerId()).isEqualTo(correctAnswer(question).getId());
        AttemptQuestionResponse reloaded = attemptService.get(attempt.id()).questions().getFirst();
        assertThat(reloaded.selectedAnswerId()).isEqualTo(wrongAnswer(question).getId());
        assertThat(reloaded.feedback().correct()).isFalse();
        assertThat(attemptService.get(attempt.id()).questions().get(1).feedback())
                .as("câu chưa trả lời không có phản hồi").isNull();
        assertThatThrownBy(() -> attemptService.saveAnswer(attempt.id(), question.getId(),
                correctAnswer(question).getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("không đổi được đáp án");
    }

    @Test
    void practice_cannotBeSubmitted() {
        AttemptResponse attempt = attemptService.start(practiceQuizId);

        assertThatThrownBy(() -> attemptService.submit(attempt.id()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Chế độ luyện tập không cần nộp bài.");
    }

    @Test
    void exam_saveAnswer_givesNoFeedback_andTheChoiceCanBeChangedBeforeSubmitting() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        Question question = published.get(attempt.questions().getFirst().questionId());

        SaveAnswerResponse first = attemptService.saveAnswer(attempt.id(), question.getId(),
                wrongAnswer(question).getId());
        attemptService.saveAnswer(attempt.id(), question.getId(), correctAnswer(question).getId());

        assertThat(first.feedback()).isNull();
        AttemptQuestionResponse reloaded = attemptService.get(attempt.id()).questions().getFirst();
        assertThat(reloaded.selectedAnswerId()).isEqualTo(correctAnswer(question).getId());
        assertThat(reloaded.feedback()).isNull();
    }

    @Test
    void exam_submit_gradesEveryQuestion_onAScaleOf10_countingBlanksAsWrong() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        List<Question> questions = questionsOf(attempt);
        answer(attempt, questions.get(0), true);
        answer(attempt, questions.get(1), true);
        answer(attempt, questions.get(2), false);
        clock.advance(Duration.ofMinutes(10));

        AttemptResponse submitted = attemptService.submit(attempt.id());

        assertThat(submitted.status()).isEqualTo(QuizResultStatus.SUBMITTED);
        assertThat(submitted.remainingSeconds()).isNull();
        assertThat(submitted.result().correctCount()).isEqualTo(2);
        assertThat(submitted.result().totalQuestions()).isEqualTo(5);
        assertThat(submitted.result().score()).isEqualByComparingTo("4.00");
        assertThat(submitted.result().submittedAt()).isEqualTo(START.plus(Duration.ofMinutes(10)));
    }

    @Test
    void exam_afterSubmitting_answersAndASecondSubmitAreRejected() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        Question question = questionsOf(attempt).getFirst();
        attemptService.submit(attempt.id());

        assertThatThrownBy(() -> attemptService.saveAnswer(attempt.id(), question.getId(),
                correctAnswer(question).getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Bài này đã nộp, không sửa được nữa.");
        assertThatThrownBy(() -> attemptService.submit(attempt.id())).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void exam_acceptsAnAnswerJustAfterTheDeadline_withinTheGracePeriod() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        clock.advance(EXAM_TIME.plusSeconds(5));

        answer(attempt, questionsOf(attempt).getFirst(), true);

        assertThat(attemptService.get(attempt.id()).status()).isEqualTo(QuizResultStatus.IN_PROGRESS);
    }

    @Test
    void exam_afterTheGracePeriod_isGradedAsExpired_withTheAnswersSavedInTime() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        List<Question> questions = questionsOf(attempt);
        answer(attempt, questions.get(0), true);
        clock.advance(EXAM_TIME.plus(AttemptService.DEADLINE_GRACE).plusSeconds(1));

        assertThatThrownBy(() -> answer(attempt, questions.get(1), true))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("hết giờ");
        AttemptResponse expired = attemptService.get(attempt.id());
        assertThat(expired.status()).isEqualTo(QuizResultStatus.EXPIRED);
        assertThat(expired.result().correctCount()).isEqualTo(1);
        assertThat(expired.result().score()).isEqualByComparingTo("2.00");
        assertThat(expired.remainingSeconds()).isNull();
    }

    @Test
    void exam_submitAfterTheGracePeriod_returnsAnExpiredResult() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        clock.advance(EXAM_TIME.plus(AttemptService.DEADLINE_GRACE).plusSeconds(1));

        AttemptResponse result = attemptService.submit(attempt.id());

        assertThat(result.status()).isEqualTo(QuizResultStatus.EXPIRED);
        assertThat(result.result().score()).isEqualByComparingTo("0.00");
    }

    @Test
    void saveAnswer_rejectsAnAnswerOfAnotherQuestion_andAQuestionOutsideTheAttempt() {
        AttemptResponse attempt = attemptService.start(examQuizId);
        List<Question> questions = questionsOf(attempt);

        assertThatThrownBy(() -> attemptService.saveAnswer(attempt.id(), questions.get(0).getId(),
                correctAnswer(questions.get(1)).getId()))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> attemptService.saveAnswer(attempt.id(), needsReview.getId(),
                correctAnswer(needsReview).getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private void answer(AttemptResponse attempt, Question question, boolean correctly) {
        Long answerId = (correctly ? correctAnswer(question) : wrongAnswer(question)).getId();
        attemptService.saveAnswer(attempt.id(), question.getId(), answerId);
    }

    private List<Question> questionsOf(AttemptResponse attempt) {
        return questionIds(attempt).stream().map(published::get).toList();
    }

    private static List<Long> questionIds(AttemptResponse attempt) {
        return attempt.questions().stream().map(AttemptQuestionResponse::questionId).toList();
    }

    private static List<Long> optionIds(AttemptResponse attempt) {
        List<Long> ids = new ArrayList<>();
        attempt.questions().forEach(question -> question.answers().stream().map(AnswerOptionResponse::id).forEach(ids::add));
        return ids;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
