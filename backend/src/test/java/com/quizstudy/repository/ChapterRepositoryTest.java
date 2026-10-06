package com.quizstudy.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.QuestionType;
import com.quizstudy.entity.Subject;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ChapterRepositoryTest {

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findBySubjectId_returnsOnlyChaptersOfThatSubject_inDisplayOrder() {
        Subject python = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        Subject gdqp = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        // Thêm lệch thứ tự để chắc kết quả được sắp theo display_order, không theo thứ tự thêm.
        entityManager.persist(new Chapter(python, "Hàm", 4));
        entityManager.persist(new Chapter(python, "Giới thiệu", 1));
        entityManager.persist(new Chapter(gdqp, "Bài 1", 1));
        entityManager.persist(new Chapter(python, "Cấu trúc lặp", 2));
        entityManager.flush();
        entityManager.clear();

        List<Chapter> chapters = chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(python.getId());

        assertThat(chapters)
                .extracting(Chapter::getTitle)
                .containsExactly("Giới thiệu", "Cấu trúc lặp", "Hàm");
    }

    @Test
    void findSummariesBySubjectId_countsOnlyPublishedQuestions_andKeepsEmptyChapters() {
        Subject subject = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        Subject other = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        Chapter second = entityManager.persist(chapter(subject, "Bài 2", 2));
        Chapter first = entityManager.persist(chapter(subject, "Bài 1", 1));
        Chapter empty = entityManager.persist(chapter(subject, "Bài 3", 3));
        Chapter otherChapter = entityManager.persist(chapter(other, "Chương 1", 1));
        persistQuestion(first, QuestionStatus.PUBLISHED);
        persistQuestion(first, QuestionStatus.PUBLISHED);
        persistQuestion(first, QuestionStatus.NEEDS_REVIEW);
        persistQuestion(second, QuestionStatus.PUBLISHED);
        persistQuestion(otherChapter, QuestionStatus.PUBLISHED);
        entityManager.flush();
        entityManager.clear();

        List<ChapterSummaryRow> rows =
                chapterRepository.findSummariesBySubjectId(subject.getId(), QuestionStatus.PUBLISHED);

        assertThat(rows)
                .extracting(ChapterSummaryRow::id, ChapterSummaryRow::code, ChapterSummaryRow::questionCount)
                .containsExactly(
                        tuple(first.getId(), "Bài 1", 2L),
                        tuple(second.getId(), "Bài 2", 1L),
                        tuple(empty.getId(), "Bài 3", 0L));
    }

    @Test
    void findByIdAndSubjectId_findsTheChapter_onlyWithinItsOwnSubject() {
        Subject python = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        Subject gdqp = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        Chapter chapter = entityManager.persist(chapter(python, "Bài 1", 1));
        entityManager.flush();

        assertThat(chapterRepository.findByIdAndSubjectId(chapter.getId(), python.getId())).contains(chapter);
        assertThat(chapterRepository.findByIdAndSubjectId(chapter.getId(), gdqp.getId())).isEmpty();
    }

    private static Chapter chapter(Subject subject, String code, int displayOrder) {
        Chapter chapter = new Chapter(subject, "Tên " + code, displayOrder);
        chapter.setCode(code);
        return chapter;
    }

    private void persistQuestion(Chapter chapter, QuestionStatus status) {
        Question question = new Question(chapter, QuestionType.SINGLE_CHOICE, "Câu hỏi", status);
        question.addAnswer("Đúng", true);
        question.addAnswer("Sai", false);
        entityManager.persist(question);
    }
}
