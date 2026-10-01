package com.quizstudy.command;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import java.util.Objects;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.SubjectRepository;

import jakarta.persistence.EntityManager;

// Chạy cả ứng dụng trên database quiz_study_test; mỗi test rollback nên không để lại dữ liệu.
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ImportCommandRunnerTest {

    @Autowired
    private ImportCommandRunner runner;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void importsTheJsonFileGivenWithTheImportOption() throws Exception {
        runner.run(new DefaultApplicationArguments("--import=" + sampleFile()));
        // Transaction của test không commit: tự flush (việc commit sẽ làm) rồi đọc lại từ database.
        entityManager.flush();
        entityManager.clear();

        Subject subject = subjectRepository.findBySlug("mon-thu-nghiem").orElseThrow();
        assertThat(subject.getName()).isEqualTo("Môn thử nghiệm");
        assertThat(subject.getCode()).isEqualTo("TN01");
        assertThat(subject.getDisplayOrder()).isEqualTo(5);
        assertThat(subject.isPublished()).isTrue();

        List<Chapter> chapters = chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(subject.getId());
        assertThat(chapters).extracting(Chapter::getCode, Chapter::getTitle)
                .containsExactly(tuple("Bài 1", "Bài mở đầu"), tuple("Bài 2", "Bài thứ hai"));

        List<Question> questions = questionsOf("mon-thu-nghiem");
        assertThat(questions).hasSize(3);

        Question first = questions.getFirst();
        assertThat(first.getStatus()).isEqualTo(QuestionStatus.PUBLISHED);
        assertThat(first.getSourceFile()).isEqualTo("tai-lieu-mau.pdf");
        assertThat(first.getSourcePage()).isEqualTo(3);
        assertThat(first.getSourceLabel()).isEqualTo("Bài 1 – Câu 1");
        assertThat(first.getAnswers())
                .extracting(Answer::getDisplayOrder, Answer::getContent, Answer::isCorrect)
                .containsExactly(
                        tuple(1, "Phương án sai thứ nhất", false),
                        tuple(2, "Phương án đúng", true),
                        tuple(3, "Phương án sai thứ hai", false));

        Question second = questions.get(1);
        assertThat(second.isShuffleAnswers()).isFalse();
        assertThat(second.getCodeSnippet()).isEqualTo("print(1)\n    print(2)");
        assertThat(second.getReviewNote()).isEqualTo("Đáp án theo quyết định X");

        Question draft = questions.get(2);
        assertThat(draft.getStatus()).isEqualTo(QuestionStatus.DRAFT);
        assertThat(draft.getSourceLabel()).isEqualTo("Bài 2 – Câu 1");
    }

    @Test
    void doesNothingWhenTheImportOptionIsAbsent() throws Exception {
        runner.run(new DefaultApplicationArguments());

        assertThat(subjectRepository.findBySlug("mon-thu-nghiem")).isEmpty();
    }

    @Test
    void failsClearlyWhenTheFileDoesNotExist() {
        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments("--import=khong-co-file-nay.json")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Không tìm thấy file import");
    }

    private List<Question> questionsOf(String slug) {
        return entityManager.createQuery(
                "select q from Question q where q.chapter.subject.slug = :slug order by q.id", Question.class)
                .setParameter("slug", slug)
                .getResultList();
    }

    private static Path sampleFile() throws URISyntaxException {
        return Path.of(Objects.requireNonNull(
                ImportCommandRunnerTest.class.getResource("/import/sample-subject.json")).toURI());
    }
}
