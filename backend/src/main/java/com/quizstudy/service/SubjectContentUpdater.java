package com.quizstudy.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.SubjectImportFile.AnswerData;
import com.quizstudy.dto.SubjectImportFile.ChapterData;
import com.quizstudy.dto.SubjectImportFile.QuestionData;
import com.quizstudy.dto.SubjectImportFile.SourceData;
import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ImportValidationException;
import com.quizstudy.mapper.SubjectImportMapper;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.QuestionRepository;
import com.quizstudy.repository.QuizRepository;
import com.quizstudy.repository.QuizResultRepository;
import com.quizstudy.repository.UserAnswerRepository;

/**
 * Ghi bài và câu hỏi của một môn từ file import, khớp với dữ liệu có sẵn để không làm hỏng lượt làm bài đã có:
 * <ul>
 * <li>Bài khớp theo thứ tự ({@code displayOrder}); câu khớp theo nguồn (file + nhãn).</li>
 * <li>Câu có trong file: thêm mới, hoặc cập nhật tại chỗ (giữ id của câu và của phương án, để lựa chọn đã lưu
 * trong các lượt làm cũ vẫn trỏ đúng). Câu đã có người làm thì nội dung và số phương án phải giữ nguyên
 * (chỉ được đổi đáp án đúng, sửa ký tự in ấn, hoặc đổi cách viết có khai báo nội dung cũ), vì phương án khớp
 * theo vị trí.</li>
 * <li>Câu không còn trong file: xoá nếu chưa ai làm; đã có người làm thì chuyển {@code ARCHIVED}
 * (.claude/rules/database.md: không xoá cứng câu đã dùng).</li>
 * <li>Bài không còn trong file: xoá cùng các đề của bài, trừ khi bài còn câu hoặc đề đã có người làm.</li>
 * </ul>
 * Có tình huống không xử lý được thì báo lỗi cho cả file; transaction của import bị huỷ nên không ghi gì.
 */
@Service
public class SubjectContentUpdater {

    private final ChapterRepository chapterRepository;
    private final QuestionRepository questionRepository;
    private final UserAnswerRepository userAnswerRepository;
    private final QuizRepository quizRepository;
    private final QuizResultRepository quizResultRepository;

    public SubjectContentUpdater(ChapterRepository chapterRepository, QuestionRepository questionRepository,
            UserAnswerRepository userAnswerRepository, QuizRepository quizRepository,
            QuizResultRepository quizResultRepository) {
        this.chapterRepository = chapterRepository;
        this.questionRepository = questionRepository;
        this.userAnswerRepository = userAnswerRepository;
        this.quizRepository = quizRepository;
        this.quizResultRepository = quizResultRepository;
    }

    /**
     * @param chapters      các bài theo thứ tự trong file
     * @param archivedCount số câu không còn trong file nhưng đã có người làm, nên chuyển ARCHIVED
     * @param removedCount  số câu không còn trong file và chưa ai làm, nên đã xoá
     */
    public record Result(List<Chapter> chapters, int archivedCount, int removedCount) {
    }

    /** Khoá khớp câu cũ với câu mới. */
    private record SourceKey(String file, String label) {

        static SourceKey of(SourceData source) {
            return new SourceKey(source.file(), source.label());
        }

        static SourceKey of(Question question) {
            return new SourceKey(question.getSourceFile(), question.getSourceLabel());
        }
    }

    /**
     * Chạy trong transaction của import (bắt buộc đã có), để lỗi ở đây huỷ luôn mọi thay đổi của lần import.
     *
     * @throws ImportValidationException nếu có câu hoặc bài không cập nhật được an toàn
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Result update(Subject subject, List<ChapterData> chapterData) {
        Map<Integer, Chapter> oldChapters = new LinkedHashMap<>();
        chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(subject.getId())
                .forEach(chapter -> oldChapters.put(chapter.getDisplayOrder(), chapter));
        Map<SourceKey, Question> oldQuestions = new LinkedHashMap<>();
        questionRepository.findWithAnswersBySubjectId(subject.getId())
                .forEach(question -> oldQuestions.put(SourceKey.of(question), question));
        Set<Long> usedQuestionIds = userAnswerRepository.findUsedQuestionIdsBySubjectId(subject.getId());
        List<String> problems = new ArrayList<>();

        List<Chapter> chapters = new ArrayList<>();
        for (ChapterData data : chapterData) {
            Chapter chapter = saveChapter(subject, data, oldChapters.remove(data.displayOrder()));
            chapters.add(chapter);
            for (QuestionData questionData : data.questions()) {
                Question existing = oldQuestions.remove(SourceKey.of(questionData.source()));
                if (existing == null) {
                    questionRepository.save(SubjectImportMapper.toQuestion(chapter, questionData));
                } else {
                    updateQuestion(existing, chapter, questionData, usedQuestionIds.contains(existing.getId()),
                            problems);
                }
            }
        }

        int archived = 0;
        Set<Long> chaptersWithArchivedQuestions = new HashSet<>();
        for (Question question : oldQuestions.values()) {
            if (usedQuestionIds.contains(question.getId())) {
                question.setStatus(QuestionStatus.ARCHIVED);
                chaptersWithArchivedQuestions.add(question.getChapter().getId());
                archived++;
            } else {
                questionRepository.delete(question);
            }
        }
        for (Chapter chapter : oldChapters.values()) {
            removeChapter(chapter, chaptersWithArchivedQuestions.contains(chapter.getId()), problems);
        }

        if (!problems.isEmpty()) {
            throw new ImportValidationException(problems);
        }
        return new Result(chapters, archived, oldQuestions.size() - archived);
    }

    private Chapter saveChapter(Subject subject, ChapterData data, Chapter existing) {
        if (existing == null) {
            return chapterRepository.save(SubjectImportMapper.toChapter(subject, data));
        }
        SubjectImportMapper.applyTo(existing, data);
        return existing;
    }

    private void updateQuestion(Question question, Chapter chapter, QuestionData data, boolean used,
            List<String> problems) {
        if (!question.getChapter().getId().equals(chapter.getId())) {
            question.moveTo(chapter);
        }
        SubjectImportMapper.applyTo(question, data);

        List<Answer> answers = question.getAnswers();
        List<AnswerData> newAnswers = data.answers();
        if (answers.size() == newAnswers.size()) {
            if (used && contentChanged(answers, newAnswers)) {
                // Phương án khớp theo vị trí: nội dung đổi (ví dụ tài liệu đảo B và D) thì lựa chọn đã lưu
                // của người học sẽ trỏ sang phương án khác. Chỉ cho đổi đáp án đúng.
                problems.add(data.source().label() + ": nội dung phương án đổi nhưng câu đã có người làm, "
                        + "chỉ được đổi đáp án đúng");
                return;
            }
            for (int i = 0; i < answers.size(); i++) {
                answers.get(i).update(newAnswers.get(i).content(), newAnswers.get(i).correct());
            }
        } else if (used) {
            problems.add(data.source().label() + ": số phương án đổi từ " + answers.size() + " thành "
                    + newAnswers.size() + " nhưng câu đã có người làm, không thay được phương án");
        } else {
            question.clearAnswers();
            questionRepository.flush(); // xoá phương án cũ trước khi thêm mới (xem Question#clearAnswers)
            SubjectImportMapper.addAnswers(question, data);
        }
    }

    /** Có phương án nào không còn là phương án cũ ở đúng vị trí cũ không (xem {@link #sameAnswer}). */
    private static boolean contentChanged(List<Answer> answers, List<AnswerData> newAnswers) {
        for (int i = 0; i < answers.size(); i++) {
            if (!sameAnswer(answers.get(i).getContent(), newAnswers.get(i))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Vẫn là phương án cũ, nên lựa chọn đã lưu vẫn đúng: chỉ khác ký tự in ấn (nháy cong / thẳng, "–" / "-",
     * khoảng trắng, D-043), hoặc file import khai báo nội dung cũ khi đổi cách viết (D-046) và nội dung cũ đó
     * khớp phương án đang lưu. Phương án bị đảo chỗ thì nội dung cũ khai báo không khớp vị trí, vẫn bị chặn.
     */
    private static boolean sameAnswer(String stored, AnswerData incoming) {
        String current = ignoringTypography(stored);
        return current.equals(ignoringTypography(incoming.content()))
                || incoming.previousContent() != null
                        && current.equals(ignoringTypography(incoming.previousContent()));
    }

    static String ignoringTypography(String text) {
        return text.replaceAll("[‘’]", "'")
                .replaceAll("[“”]", "\"")
                .replaceAll("[–—]", "-")
                .replaceAll("\\s+", " ")
                .strip();
    }

    private void removeChapter(Chapter chapter, boolean hasArchivedQuestions, List<String> problems) {
        String name = "Bài thứ " + chapter.getDisplayOrder() + " (" + chapter.getTitle() + ")";
        if (hasArchivedQuestions) {
            problems.add(name + " không còn trong file nhưng có câu đã có người làm, không xoá được");
        } else if (quizResultRepository.existsByQuizChapterId(chapter.getId())) {
            problems.add(name + " không còn trong file nhưng đề của bài đã có người làm, không xoá được");
        } else {
            quizRepository.deleteAll(quizRepository.findByChapterId(chapter.getId()));
            chapterRepository.delete(chapter);
        }
    }
}
