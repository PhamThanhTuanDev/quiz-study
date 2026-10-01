package com.quizstudy.service;

import static com.quizstudy.entity.QuestionStatus.ARCHIVED;
import static com.quizstudy.entity.QuestionStatus.DRAFT;
import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.entity.QuestionType.SINGLE_CHOICE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.assertj.core.groups.Tuple;
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
import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.QuizResult;
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

        assertThat(result).isEqualTo(new SubjectImportResult(SLUG, 1, 2, 1, false, 0, 0));
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
                                "chapters[0].questions[0].shuffleAnswers: không được để trống",
                                "chapters[0].questions[0].source: không được để trống"));
    }

    @Test
    void importSubject_requiresTheCorrectFlag_onEveryAnswer() {
        QuestionData question = new QuestionData(SINGLE_CHOICE, "Câu hỏi", null, null, true, DRAFT, null,
                source("Nhãn câu hỏi"), List.of(new AnswerData("A", null), answer("B", false)));

        assertThatThrownBy(() -> importService.importSubject(fileWith("Tên môn", question), false))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly("chapters[0].questions[0].answers[0].correct: không được để trống"));
    }

    @Test
    void importSubject_rejectsTwoQuestionsWithTheSameSource() {
        SubjectImportFile file = fileWith("Tên môn",
                question("Câu 1", "Câu 5", DRAFT, answer("A", false), answer("B", false)),
                question("Câu 1", "Câu 6", DRAFT, answer("A", false), answer("B", false)));

        assertThatThrownBy(() -> importService.importSubject(file, false))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly("chapters[0].questions[1] (Câu 1): trùng nguồn (file + nhãn) với một câu khác"));
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
    void importSubject_withReplace_updatesTheSameSubject_andDeletesQuestionsNoLongerInTheFile() {
        importService.importSubject(fileWith("Tên cũ", question("Câu cũ", DRAFT, answer("A", false), answer("B", false))), false);
        Long originalId = subjectRepository.findBySlug(SLUG).orElseThrow().getId();

        SubjectImportResult result = importService.importSubject(
                fileWith("Tên mới", question("Câu mới", PUBLISHED, answer("A", true), answer("B", false))), true);
        flushAndClear();

        Subject subject = subjectRepository.findBySlug(SLUG).orElseThrow();
        assertThat(result).isEqualTo(new SubjectImportResult(SLUG, 1, 1, 1, true, 0, 1));
        assertThat(subject.getId()).isEqualTo(originalId);
        assertThat(subject.getName()).isEqualTo("Tên mới");
        assertThat(chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(originalId)).hasSize(1);
        assertThat(questionContents()).containsExactly("Câu mới");
    }

    @Test
    void reimport_updatesQuestionInPlace_keepingQuestionAndAnswerIds() {
        importService.importSubject(fileWith("Môn",
                question("Câu 1", "Đề cũ", DRAFT, answer("A cũ", false), answer("B cũ", false))), false);
        Question before = onlyQuestion();
        List<Long> answerIdsBefore = before.getAnswers().stream().map(Answer::getId).toList();
        flushAndClear();

        importService.importSubject(fileWith("Môn",
                question("Câu 1", "Đề mới", PUBLISHED, answer("A mới", false), answer("B mới", true))), true);
        flushAndClear();

        Question after = onlyQuestion();
        assertThat(after.getId()).isEqualTo(before.getId());
        assertThat(after.getContent()).isEqualTo("Đề mới");
        assertThat(after.getStatus()).isEqualTo(PUBLISHED);
        assertThat(after.getAnswers())
                .extracting(Answer::getId, Answer::getContent, Answer::isCorrect)
                .containsExactly(
                        tuple(answerIdsBefore.get(0), "A mới", false),
                        tuple(answerIdsBefore.get(1), "B mới", true));
    }

    @Test
    void reimport_replacesAnswersOfAnUnusedQuestion_whenTheirNumberChanges() {
        importService.importSubject(fileWith("Môn",
                question("Câu 1", "Đề", DRAFT, answer("A", false), answer("B", false))), false);
        flushAndClear();

        importService.importSubject(fileWith("Môn",
                question("Câu 1", "Đề", PUBLISHED, answer("A", false), answer("B", false), answer("C", true))), true);
        flushAndClear();

        assertThat(onlyQuestion().getAnswers())
                .extracting(Answer::getDisplayOrder, Answer::getContent, Answer::isCorrect)
                .containsExactly(tuple(1, "A", false), tuple(2, "B", false), tuple(3, "C", true));
    }

    @Test
    void reimport_rejectsChangingTheNumberOfAnswers_ofAQuestionSomeoneHasAnswered() {
        importService.importSubject(fileWith("Môn",
                question("Câu 1", "Đề", PUBLISHED, answer("A", true), answer("B", false))), false);
        markAsUsed(onlyQuestion());

        SubjectImportFile changed = fileWith("Môn",
                question("Câu 1", "Đề", PUBLISHED, answer("A", true), answer("B", false), answer("C", false)));

        assertThatThrownBy(() -> importService.importSubject(changed, true))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly("Câu 1: số phương án đổi từ 2 thành 3 nhưng câu đã có người làm, "
                                + "không thay được phương án"));
    }

    @Test
    void reimport_archivesARemovedQuestionSomeoneHasAnswered_andDeletesAnUnusedOne() {
        importService.importSubject(fileWith("Môn",
                question("Câu đã làm", PUBLISHED, answer("A", true), answer("B", false)),
                question("Câu chưa làm", PUBLISHED, answer("A", true), answer("B", false)),
                question("Câu giữ lại", PUBLISHED, answer("A", true), answer("B", false))), false);
        markAsUsed(questionWithContent("Câu đã làm"));

        SubjectImportResult result = importService.importSubject(fileWith("Môn",
                question("Câu giữ lại", PUBLISHED, answer("A", true), answer("B", false))), true);
        flushAndClear();

        assertThat(result.archivedCount()).isEqualTo(1);
        assertThat(result.removedCount()).isEqualTo(1);
        assertThat(questionStatuses()).containsExactly(tuple("Câu đã làm", ARCHIVED), tuple("Câu giữ lại", PUBLISHED));
    }

    @Test
    void reimport_movesAQuestionToAnotherChapter_andDeletesARemovedUnusedChapter() {
        importService.importSubject(file("Môn",
                chapter(1, "Bài 1", question("Câu A", PUBLISHED, answer("A", true), answer("B", false))),
                chapter(2, "Bài 2", question("Câu B", PUBLISHED, answer("A", true), answer("B", false)))), false);
        Long questionBId = questionWithContent("Câu B").getId();
        flushAndClear();

        importService.importSubject(file("Môn",
                chapter(1, "Bài 1 (sửa tên)",
                        question("Câu A", PUBLISHED, answer("A", true), answer("B", false)),
                        question("Câu B", PUBLISHED, answer("A", true), answer("B", false)))), true);
        flushAndClear();

        Long subjectId = subjectRepository.findBySlug(SLUG).orElseThrow().getId();
        assertThat(chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(subjectId))
                .extracting("title").containsExactly("Bài 1 (sửa tên)");
        Question moved = entityManager.find(Question.class, questionBId);
        assertThat(moved.getChapter().getTitle()).isEqualTo("Bài 1 (sửa tên)");
        assertThat(quizTitles()).containsExactly("Luyện tập: Bài 1 (sửa tên)", "Thi thử: Môn");
    }

    @Test
    void reimport_rejectsRemovingAChapter_whoseQuestionSomeoneHasAnswered() {
        importService.importSubject(file("Môn",
                chapter(1, "Bài 1", question("Câu A", PUBLISHED, answer("A", true), answer("B", false))),
                chapter(2, "Bài 2", question("Câu B", PUBLISHED, answer("A", true), answer("B", false)))), false);
        markAsUsed(questionWithContent("Câu B"));

        SubjectImportFile withoutChapter2 = file("Môn",
                chapter(1, "Bài 1", question("Câu A", PUBLISHED, answer("A", true), answer("B", false))));

        assertThatThrownBy(() -> importService.importSubject(withoutChapter2, true))
                .isInstanceOfSatisfying(ImportValidationException.class, ex -> assertThat(ex.getProblems())
                        .containsExactly("Bài thứ 2 (Bài 2) không còn trong file nhưng có câu đã có người làm, "
                                + "không xoá được"));
    }

    @Test
    void importSubject_createsOnePracticeQuizPerChapter_andOneExamForTheSubject_onlyOnce() {
        SubjectImportFile twoChapters = file("Môn",
                chapter(1, "Bài 1", question("Câu A", PUBLISHED, answer("A", true), answer("B", false))),
                chapter(2, "Bài 2", question("Câu B", PUBLISHED, answer("A", true), answer("B", false))));

        importService.importSubject(twoChapters, false);
        importService.importSubject(twoChapters, true);
        flushAndClear();

        List<Quiz> quizzes = quizzes();
        assertThat(quizzes)
                .extracting(Quiz::getTitle, Quiz::getMode, Quiz::getQuestionCount, Quiz::getTimeLimitMinutes,
                        Quiz::isPublished)
                .containsExactly(
                        tuple("Luyện tập: Bài 1", QuizMode.PRACTICE, 20, null, true),
                        tuple("Luyện tập: Bài 2", QuizMode.PRACTICE, 20, null, true),
                        tuple("Thi thử: Môn", QuizMode.EXAM, 40, 45, true));
    }

    /**
     * Test chạy trong transaction không bao giờ commit, nên phải tự flush (việc commit sẽ làm) rồi mới
     * xoá bộ nhớ đệm để đọc lại đúng những gì đã ghi xuống database.
     */
    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    /** Tạo một lượt làm bài có câu này, để câu được coi là "đã có người làm". */
    private void markAsUsed(Question question) {
        Quiz quiz = quizzes().getLast();
        QuizResult result = new QuizResult(quiz, UUID.randomUUID().toString(), Instant.now(), null);
        result.addQuestion(question);
        entityManager.persist(result);
        flushAndClear();
    }

    private Question onlyQuestion() {
        return entityManager.createQuery("select q from Question q where q.chapter.subject.slug = :slug", Question.class)
                .setParameter("slug", SLUG)
                .getSingleResult();
    }

    private Question questionWithContent(String content) {
        return entityManager.createQuery(
                "select q from Question q where q.chapter.subject.slug = :slug and q.content = :content", Question.class)
                .setParameter("slug", SLUG)
                .setParameter("content", content)
                .getSingleResult();
    }

    private List<String> questionContents() {
        return entityManager.createQuery(
                "select q.content from Question q where q.chapter.subject.slug = :slug order by q.id", String.class)
                .setParameter("slug", SLUG)
                .getResultList();
    }

    private List<Tuple> questionStatuses() {
        return entityManager.createQuery(
                "select q from Question q where q.chapter.subject.slug = :slug order by q.id", Question.class)
                .setParameter("slug", SLUG)
                .getResultStream()
                .map(question -> tuple(question.getContent(), question.getStatus()))
                .toList();
    }

    private List<Quiz> quizzes() {
        return entityManager.createQuery(
                "select q from Quiz q where q.subject.slug = :slug order by q.mode desc, q.title", Quiz.class)
                .setParameter("slug", SLUG)
                .getResultList();
    }

    private List<String> quizTitles() {
        return quizzes().stream().map(Quiz::getTitle).toList();
    }

    private static SubjectImportFile fileWith(String subjectName, QuestionData... questions) {
        return file(subjectName, chapter(1, "Bài kiểm tra", questions));
    }

    private static SubjectImportFile file(String subjectName, ChapterData... chapters) {
        SubjectData subject = new SubjectData(SLUG, subjectName, null, null, 1, true);
        return new SubjectImportFile(1, subject, List.of(chapters));
    }

    private static ChapterData chapter(int order, String title, QuestionData... questions) {
        return new ChapterData("Bài " + order, title, order, List.of(questions));
    }

    /** Câu có nhãn nguồn "Nhãn <nội dung>". */
    private static QuestionData question(String content, QuestionStatus status, AnswerData... answers) {
        return question("Nhãn " + content, content, status, answers);
    }

    private static QuestionData question(String label, String content, QuestionStatus status, AnswerData... answers) {
        return new QuestionData(SINGLE_CHOICE, content, null, null, true, status, null, source(label),
                List.of(answers));
    }

    private static SourceData source(String label) {
        return new SourceData("tai-lieu.pdf", 1, label);
    }

    private static AnswerData answer(String content, boolean correct) {
        return new AnswerData(content, correct);
    }
}
