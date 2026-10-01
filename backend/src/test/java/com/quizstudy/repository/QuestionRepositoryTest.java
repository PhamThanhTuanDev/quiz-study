package com.quizstudy.repository;

import static com.quizstudy.entity.QuestionStatus.NEEDS_REVIEW;
import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.entity.QuestionType.SINGLE_CHOICE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class QuestionRepositoryTest {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Chapter chapter;

    @BeforeEach
    void createChapter() {
        Subject subject = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        chapter = entityManager.persist(new Chapter(subject, "Các khái niệm cơ bản", 1));
    }

    @Test
    void save_storesAnswersTogetherWithQuestion_inDisplayOrder() {
        Question question = new Question(chapter, SINGLE_CHOICE, "Kết quả của 7 // 2 là gì?", PUBLISHED);
        question.addAnswer("3.5", false);
        question.addAnswer("3", true);
        question.addAnswer("4", false);
        question.addAnswer("Lỗi", false);
        Long id = questionRepository.saveAndFlush(question).getId();
        entityManager.clear();

        Question saved = questionRepository.findById(id).orElseThrow();

        assertThat(saved.getAnswers())
                .extracting(Answer::getDisplayOrder, Answer::getContent, Answer::isCorrect)
                .containsExactly(
                        tuple(1, "3.5", false),
                        tuple(2, "3", true),
                        tuple(3, "4", false),
                        tuple(4, "Lỗi", false));
    }

    // Lưu ý: MySQL thường đọc phương án qua index UNIQUE (question_id, display_order) nên kết quả đã theo
    // thứ tự sẵn; test này kiểm tra yêu cầu (luôn ra A, B…), không tách riêng được tác dụng của @OrderBy.
    // @OrderBy vẫn cần để thứ tự không phụ thuộc vào cách MySQL chọn index.
    @Test
    void answers_areReadInDisplayOrder_evenWhenStoredInAnotherOrder() {
        Question question = entityManager.persistAndFlush(
                new Question(chapter, SINGLE_CHOICE, "Câu có phương án được lưu lệch thứ tự", PUBLISHED));
        // Thêm bằng SQL để id tăng dần nhưng display_order giảm dần; addAnswer() không tạo được tình huống này.
        entityManager.getEntityManager()
                .createNativeQuery("INSERT INTO answers (question_id, display_order, content, is_correct) "
                        + "VALUES (:id, 2, 'B', FALSE), (:id, 1, 'A', TRUE)")
                .setParameter("id", question.getId())
                .executeUpdate();
        entityManager.clear();

        Question loadedById = questionRepository.findById(question.getId()).orElseThrow();
        assertThat(loadedById.getAnswers()).extracting(Answer::getContent).containsExactly("A", "B");

        entityManager.clear();
        List<Question> loadedWithGraph =
                questionRepository.findByChapterIdAndStatusOrderByIdAsc(chapter.getId(), PUBLISHED);
        assertThat(loadedWithGraph.getFirst().getAnswers()).extracting(Answer::getContent).containsExactly("A", "B");
    }

    @Test
    void save_keepsVietnameseTextAndCodeIndentation() {
        String content = "Đoạn code sau in ra những số nào? 🐍";
        String code = "for i in range(5):\n    if i % 2 == 0:\n        print(i)";
        Question question = new Question(chapter, SINGLE_CHOICE, content, PUBLISHED);
        question.setCodeSnippet(code);
        question.setSourceLabel("Câu 5 (gốc: điền khuyết)");
        Long id = questionRepository.saveAndFlush(question).getId();
        entityManager.clear();

        Question saved = questionRepository.findById(id).orElseThrow();

        assertThat(saved.getContent()).isEqualTo(content);
        assertThat(saved.getCodeSnippet()).isEqualTo(code);
        assertThat(saved.getSourceLabel()).isEqualTo("Câu 5 (gốc: điền khuyết)");
        assertThat(saved.isShuffleAnswers()).isTrue();
    }

    @Test
    void findByChapterIdAndStatus_returnsOnlyMatchingQuestions_withAnswersAlreadyLoaded() {
        Chapter otherChapter = entityManager.persist(new Chapter(chapter.getSubject(), "Hàm", 2));
        persistQuestion(chapter, "Câu đã duyệt", PUBLISHED);
        persistQuestion(chapter, "Câu chờ duyệt", NEEDS_REVIEW);
        persistQuestion(otherChapter, "Câu ở chương khác", PUBLISHED);
        entityManager.flush();
        entityManager.clear();

        List<Question> questions = questionRepository.findByChapterIdAndStatusOrderByIdAsc(chapter.getId(), PUBLISHED);

        assertThat(questions).extracting(Question::getContent).containsExactly("Câu đã duyệt");
        // Phương án phải được nạp sẵn trong cùng truy vấn (@EntityGraph), không phải truy vấn thêm.
        assertThat(isLoaded(questions.getFirst(), "answers")).isTrue();
        assertThat(questions.getFirst().getAnswers()).hasSize(2);
    }

    @Test
    void findIds_byChapterOrSubject_returnOnlyQuestionsWithRequestedStatus() {
        Chapter otherChapter = entityManager.persist(new Chapter(chapter.getSubject(), "Hàm", 2));
        Subject otherSubject = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        Chapter otherSubjectChapter = entityManager.persist(new Chapter(otherSubject, "Bài 1", 1));
        Question inChapter = persistQuestion(chapter, "Câu ở chương 1", PUBLISHED);
        persistQuestion(chapter, "Câu chờ duyệt", NEEDS_REVIEW);
        Question inOtherChapter = persistQuestion(otherChapter, "Câu ở chương 2", PUBLISHED);
        persistQuestion(otherSubjectChapter, "Câu môn khác", PUBLISHED);
        entityManager.flush();

        assertThat(questionRepository.findIdsByChapterIdAndStatus(chapter.getId(), PUBLISHED))
                .containsExactly(inChapter.getId());
        assertThat(questionRepository.findIdsBySubjectIdAndStatus(chapter.getSubject().getId(), PUBLISHED))
                .containsExactlyInAnyOrder(inChapter.getId(), inOtherChapter.getId());
    }

    @Test
    void findWithAnswersByIdIn_loadsAnswersInTheSameQuery() {
        Question first = persistQuestion(chapter, "Câu 1", PUBLISHED);
        Question second = persistQuestion(chapter, "Câu 2", PUBLISHED);
        persistQuestion(chapter, "Câu không được hỏi", PUBLISHED);
        entityManager.flush();
        entityManager.clear();

        List<Question> questions = questionRepository.findWithAnswersByIdIn(List.of(first.getId(), second.getId()));

        assertThat(questions).extracting(Question::getContent).containsExactlyInAnyOrder("Câu 1", "Câu 2");
        assertThat(questions).allSatisfy(question -> assertThat(isLoaded(question, "answers")).isTrue());
    }

    private Question persistQuestion(Chapter targetChapter, String content, QuestionStatus status) {
        Question question = new Question(targetChapter, SINGLE_CHOICE, content, status);
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
}
