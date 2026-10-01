package com.quizstudy.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.Subject;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class QuizRepositoryTest {

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findPublishedBySubject_returnsOnlyPublishedQuizzesOfThatSubject_withChapterLoaded() {
        Subject python = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        Subject gdqp = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        Chapter chapter = entityManager.persist(new Chapter(python, "Hàm", 7));
        persistQuiz(python, chapter, "Luyện tập: Hàm", QuizMode.PRACTICE, true);
        persistQuiz(python, null, "Thi thử: Python", QuizMode.EXAM, true);
        persistQuiz(python, chapter, "Đề chưa publish", QuizMode.PRACTICE, false);
        persistQuiz(gdqp, null, "Thi thử: GDQP", QuizMode.EXAM, true);
        entityManager.flush();
        entityManager.clear();

        List<Quiz> quizzes = quizRepository.findBySubjectIdAndPublishedTrueOrderByIdAsc(python.getId());

        assertThat(quizzes).extracting(Quiz::getTitle).containsExactly("Luyện tập: Hàm", "Thi thử: Python");
        assertThat(isLoaded(quizzes.getFirst(), "chapter")).isTrue();
        assertThat(quizzes.getFirst().getChapter().getTitle()).isEqualTo("Hàm");
        assertThat(quizzes.get(1).getChapter()).isNull();
    }

    private void persistQuiz(Subject subject, Chapter chapter, String title, QuizMode mode, boolean published) {
        Quiz quiz = new Quiz(subject, chapter, title, mode, 20);
        quiz.setPublished(published);
        entityManager.persist(quiz);
    }

    private boolean isLoaded(Object entity, String attribute) {
        return entityManager.getEntityManager()
                .getEntityManagerFactory()
                .getPersistenceUnitUtil()
                .isLoaded(entity, attribute);
    }
}
