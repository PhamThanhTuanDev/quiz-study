package com.quizstudy.repository;

import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.entity.QuestionType.SINGLE_CHOICE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.QuizResult;
import com.quizstudy.entity.QuizResultStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.entity.UserAnswer;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class QuizResultRepositoryTest {

    // Mốc thời gian cố định (không có phần nano giây) để so sánh được sau khi đọc lại từ MySQL.
    private static final Instant STARTED_AT = Instant.parse("2026-10-01T02:00:00Z");

    @Autowired
    private QuizResultRepository quizResultRepository;

    @Autowired
    private UserAnswerRepository userAnswerRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Subject subject;
    private Chapter chapter;
    private Quiz quiz;

    @BeforeEach
    void createQuiz() {
        subject = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        chapter = entityManager.persist(new Chapter(subject, "Hàm", 7));
        quiz = entityManager.persist(new Quiz(subject, null, "Thi thử: Python", QuizMode.EXAM, 40));
    }

    @Test
    void save_storesQuestionsInOrder_andReadsBackByPublicId() {
        Question first = persistQuestion("Câu thứ nhất");
        Question second = persistQuestion("Câu thứ hai");
        String publicId = UUID.randomUUID().toString();
        Instant expiresAt = STARTED_AT.plus(45, ChronoUnit.MINUTES);
        QuizResult result = new QuizResult(quiz, publicId, STARTED_AT, expiresAt);
        result.addQuestion(second);
        result.addQuestion(first);
        quizResultRepository.saveAndFlush(result);
        entityManager.clear();

        QuizResult saved = quizResultRepository.findByPublicId(publicId).orElseThrow();

        assertThat(saved.getStatus()).isEqualTo(QuizResultStatus.IN_PROGRESS);
        assertThat(saved.getTotalQuestions()).isEqualTo(2);
        assertThat(saved.getStartedAt()).isEqualTo(STARTED_AT);
        assertThat(saved.getExpiresAt()).isEqualTo(expiresAt);
        assertThat(saved.getQuiz().getTitle()).isEqualTo("Thi thử: Python");
        assertThat(saved.getAnswers())
                .extracting(answer -> answer.getQuestion().getContent(), UserAnswer::getQuestionOrder)
                .containsExactly(tuple("Câu thứ hai", 1), tuple("Câu thứ nhất", 2));
    }

    @Test
    void finish_storesScoreWithTwoDecimals() {
        Question question = persistQuestion("Câu hỏi");
        QuizResult result = new QuizResult(quiz, UUID.randomUUID().toString(), STARTED_AT, null);
        result.addQuestion(question).select(question.getAnswers().getFirst(), STARTED_AT.plusSeconds(30));
        result.getAnswers().getFirst().grade();
        result.finish(QuizResultStatus.SUBMITTED, 1, new BigDecimal("6.67"), STARTED_AT.plusSeconds(60));
        Long id = quizResultRepository.saveAndFlush(result).getId();
        entityManager.clear();

        QuizResult saved = quizResultRepository.findById(id).orElseThrow();

        assertThat(saved.getScore()).isEqualByComparingTo("6.67");
        assertThat(saved.getCorrectCount()).isEqualTo(1);
        assertThat(saved.getSubmittedAt()).isEqualTo(STARTED_AT.plusSeconds(60));
        assertThat(saved.getAnswers().getFirst().getCorrect()).isTrue();
    }

    @Test
    void publicId_mustBeUnique() {
        String publicId = UUID.randomUUID().toString();
        quizResultRepository.saveAndFlush(new QuizResult(quiz, publicId, STARTED_AT, null));

        assertThatThrownBy(() -> quizResultRepository.saveAndFlush(new QuizResult(quiz, publicId, STARTED_AT, null)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void findWithQuestionByQuizResultId_returnsQuestionsInOrder_withQuestionAndChoiceLoaded() {
        Question first = persistQuestion("Câu A");
        Question second = persistQuestion("Câu B");
        QuizResult result = new QuizResult(quiz, UUID.randomUUID().toString(), STARTED_AT, null);
        result.addQuestion(first).select(first.getAnswers().get(1), STARTED_AT);
        result.addQuestion(second);
        Long id = quizResultRepository.saveAndFlush(result).getId();
        entityManager.clear();

        List<UserAnswer> answers = userAnswerRepository.findWithQuestionByQuizResultId(id);

        assertThat(answers).extracting(UserAnswer::getQuestionOrder).containsExactly(1, 2);
        assertThat(isLoaded(answers.getFirst(), "question")).isTrue();
        assertThat(isLoaded(answers.getFirst().getSelectedAnswer())).isTrue();
        assertThat(answers.getFirst().getSelectedAnswer().getContent()).isEqualTo("Sai");
        assertThat(answers.get(1).getSelectedAnswer()).isNull();
    }

    @Test
    void findUsedQuestionIdsBySubjectId_returnsOnlyQuestionsOfThatSubjectThatWereDrawn() {
        Question used = persistQuestion("Đã có người làm");
        persistQuestion("Chưa ai làm");
        Subject other = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        Chapter otherChapter = entityManager.persist(new Chapter(other, "Bài 1", 1));
        Quiz otherQuiz = entityManager.persist(new Quiz(other, null, "Thi thử: GDQP", QuizMode.EXAM, 40));
        Question usedInOtherSubject = persistQuestion(otherChapter, "Câu môn khác");
        QuizResult result = new QuizResult(quiz, UUID.randomUUID().toString(), STARTED_AT, null);
        result.addQuestion(used);
        QuizResult otherResult = new QuizResult(otherQuiz, UUID.randomUUID().toString(), STARTED_AT, null);
        otherResult.addQuestion(usedInOtherSubject);
        quizResultRepository.saveAll(List.of(result, otherResult));
        entityManager.flush();

        assertThat(userAnswerRepository.findUsedQuestionIdsBySubjectId(subject.getId())).containsExactly(used.getId());
    }

    private Question persistQuestion(String content) {
        return persistQuestion(chapter, content);
    }

    private Question persistQuestion(Chapter targetChapter, String content) {
        Question question = new Question(targetChapter, SINGLE_CHOICE, content, PUBLISHED);
        question.addAnswer("Đúng", true);
        question.addAnswer("Sai", false);
        return entityManager.persist(question);
    }

    private boolean isLoaded(Object entity, String attribute) {
        return entityManager.getEntityManager()
                .getEntityManagerFactory()
                .getPersistenceUnitUtil()
                .isLoaded(entity, attribute);
    }

    private boolean isLoaded(Object entity) {
        return entityManager.getEntityManager()
                .getEntityManagerFactory()
                .getPersistenceUnitUtil()
                .isLoaded(entity);
    }
}
