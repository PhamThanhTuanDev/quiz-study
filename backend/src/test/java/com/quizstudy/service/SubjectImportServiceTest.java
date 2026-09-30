package com.quizstudy.service;

import static com.quizstudy.entity.QuestionStatus.DRAFT;
import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.entity.QuestionType.SINGLE_CHOICE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.SubjectImportFile;
import com.quizstudy.dto.SubjectImportFile.AnswerData;
import com.quizstudy.dto.SubjectImportFile.ChapterData;
import com.quizstudy.dto.SubjectImportFile.QuestionData;
import com.quizstudy.dto.SubjectImportFile.SourceData;
import com.quizstudy.dto.SubjectImportFile.SubjectData;
import com.quizstudy.dto.SubjectImportResult;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ImportValidationException;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.SubjectRepository;

import jakarta.persistence.EntityManager;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SubjectImportServiceTest {

    private static final String SLUG = "mon-kiem-tra";

    @Autowired
    private SubjectImportService importService;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void importSubject_savesEverything_andCountsPublishedQuestions() {
        SubjectImportFile file = fileWith("Tên môn",
                question("Câu 1", PUBLISHED, answer("Sai", false), answer("Đúng", true)),
                question("Câu 2", DRAFT, answer("A", false), answer("B", false)));

        SubjectImportResult result = importService.importSubject(file, false);

        assertThat(result).isEqualTo(new SubjectImportResult(SLUG, 1, 2, 1, false));
        assertThat(questionContents()).containsExactly("Câu 1", "Câu 2");
    }

    @Test
    void importSubject_rejectsPublishedQuestion_withoutExactlyOneCorrectAnswer() {
        SubjectImportFile file = fileWith("Tên môn",
                question("Không có đáp án", PUBLISHED, answer("A", false), answer("B", false)),
                question("Hai đáp án", PUBLISHED, answer("A", true), answer("B", true)));

        assertThatThrownBy(() -> importService.importSubject(file, false))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly(
                                "chapters[0].questions[0] (Nhãn Không có đáp án): câu PUBLISHED phải có đúng 1 phương án đúng (đang có 0)",
                                "chapters[0].questions[1] (Nhãn Hai đáp án): câu một đáp án nhưng có 2 phương án đúng",
                                "chapters[0].questions[1] (Nhãn Hai đáp án): câu PUBLISHED phải có đúng 1 phương án đúng (đang có 2)"));
        assertThat(subjectRepository.findBySlug(SLUG)).as("không ghi gì khi file lỗi").isEmpty();
    }

    @Test
    void importSubject_rejectsQuestion_withFewerThanTwoAnswers() {
        SubjectImportFile file = fileWith("Tên môn", question("Một phương án", DRAFT, answer("A", false)));

        assertThatThrownBy(() -> importService.importSubject(file, false))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly("chapters[0].questions[0] (Nhãn Một phương án): cần ít nhất 2 phương án"));
    }

    @Test
    void importSubject_reportsMissingFields_withTheirPositionInTheFile() {
        QuestionData blank = new QuestionData(SINGLE_CHOICE, " ", null, null, null, PUBLISHED, null, null,
                List.of(answer("A", true), answer("B", false)));

        assertThatThrownBy(() -> importService.importSubject(fileWith("Tên môn", blank), false))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly(
                                "chapters[0].questions[0].content: không được để trống",
                                "chapters[0].questions[0].shuffleAnswers: không được để trống"));
    }

    @Test
    void importSubject_requiresTheCorrectFlag_onEveryAnswer() {
        QuestionData question = new QuestionData(SINGLE_CHOICE, "Câu hỏi", null, null, true, DRAFT, null, null,
                List.of(new AnswerData("A", null), answer("B", false)));

        assertThatThrownBy(() -> importService.importSubject(fileWith("Tên môn", question), false))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly("chapters[0].questions[0].answers[0].correct: không được để trống"));
    }

    @Test
    void importSubject_refusesAnExistingSubject_unlessReplaceIsRequested() {
        importService.importSubject(fileWith("Tên cũ", question("Câu cũ", DRAFT, answer("A", false), answer("B", false))), false);

        SubjectImportFile again = fileWith("Tên mới", question("Câu mới", DRAFT, answer("A", false), answer("B", false)));

        assertThatThrownBy(() -> importService.importSubject(again, false))
                .isInstanceOf(ImportValidationException.class)
                .hasMessageContaining("--replace");
    }

    @Test
    void importSubject_withReplace_swapsTheContentButKeepsTheSameSubject() {
        importService.importSubject(fileWith("Tên cũ", question("Câu cũ", DRAFT, answer("A", false), answer("B", false))), false);
        Long originalId = subjectRepository.findBySlug(SLUG).orElseThrow().getId();

        SubjectImportResult result = importService.importSubject(
                fileWith("Tên mới", question("Câu mới", PUBLISHED, answer("A", true), answer("B", false))), true);
        flushAndClear();

        Subject subject = subjectRepository.findBySlug(SLUG).orElseThrow();
        assertThat(result.replacedExisting()).isTrue();
        assertThat(subject.getId()).isEqualTo(originalId);
        assertThat(subject.getName()).isEqualTo("Tên mới");
        assertThat(chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(originalId)).hasSize(1);
        assertThat(questionContents()).containsExactly("Câu mới");
    }

    /**
     * Test chạy trong transaction không bao giờ commit, nên phải tự flush (việc commit sẽ làm) rồi mới
     * xoá bộ nhớ đệm để đọc lại đúng những gì đã ghi xuống database.
     */
    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private List<String> questionContents() {
        return entityManager.createQuery(
                "select q.content from Question q where q.chapter.subject.slug = :slug order by q.id", String.class)
                .setParameter("slug", SLUG)
                .getResultList();
    }

    private static SubjectImportFile fileWith(String subjectName, QuestionData... questions) {
        SubjectData subject = new SubjectData(SLUG, subjectName, null, null, 1, true);
        ChapterData chapter = new ChapterData("Bài 1", "Bài kiểm tra", 1, List.of(questions));
        return new SubjectImportFile(1, subject, List.of(chapter));
    }

    private static QuestionData question(String content, QuestionStatus status, AnswerData... answers) {
        return new QuestionData(SINGLE_CHOICE, content, null, null, true, status, null,
                new SourceData("tai-lieu.pdf", 1, "Nhãn " + content), List.of(answers));
    }

    private static AnswerData answer(String content, boolean correct) {
        return new AnswerData(content, correct);
    }
}
