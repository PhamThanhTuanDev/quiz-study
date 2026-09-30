package com.quizstudy.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.SubjectImportFile;
import com.quizstudy.dto.SubjectImportFile.ChapterData;
import com.quizstudy.dto.SubjectImportFile.QuestionData;
import com.quizstudy.dto.SubjectImportResult;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.QuestionType;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ImportValidationException;
import com.quizstudy.mapper.SubjectImportMapper;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.QuestionRepository;
import com.quizstudy.repository.SubjectRepository;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

/**
 * Import một môn từ file JSON đã được chủ dự án duyệt.
 * Kiểm tra toàn bộ file trước, rồi ghi tất cả trong một transaction: hoặc thành công hết, hoặc không ghi gì.
 */
@Service
public class SubjectImportService {

    private final SubjectRepository subjectRepository;
    private final ChapterRepository chapterRepository;
    private final QuestionRepository questionRepository;
    private final Validator validator;

    public SubjectImportService(SubjectRepository subjectRepository, ChapterRepository chapterRepository,
            QuestionRepository questionRepository, Validator validator) {
        this.subjectRepository = subjectRepository;
        this.chapterRepository = chapterRepository;
        this.questionRepository = questionRepository;
        this.validator = validator;
    }

    /**
     * @param replace true: nếu môn đã có thì xoá toàn bộ bài và câu hỏi cũ của môn đó rồi ghi lại.
     *                An toàn vì chưa có bài làm tham chiếu tới câu hỏi (bảng làm bài có từ Phase 5).
     * @throws ImportValidationException nếu file có lỗi, hoặc môn đã có mà không chọn replace
     */
    @Transactional
    public SubjectImportResult importSubject(SubjectImportFile file, boolean replace) {
        List<String> problems = validate(file);
        if (!problems.isEmpty()) {
            throw new ImportValidationException(problems);
        }

        Optional<Subject> existing = subjectRepository.findBySlug(file.subject().slug());
        Subject subject = existing.isPresent()
                ? replaceContent(existing.get(), file, replace)
                : subjectRepository.save(SubjectImportMapper.toNewSubject(file.subject()));

        int questionCount = 0;
        int publishedCount = 0;
        for (ChapterData chapterData : file.chapters()) {
            Chapter chapter = chapterRepository.save(SubjectImportMapper.toChapter(subject, chapterData));
            for (QuestionData questionData : chapterData.questions()) {
                questionRepository.save(SubjectImportMapper.toQuestion(chapter, questionData));
                questionCount++;
                if (questionData.status() == QuestionStatus.PUBLISHED) {
                    publishedCount++;
                }
            }
        }
        return new SubjectImportResult(subject.getSlug(), file.chapters().size(), questionCount, publishedCount,
                existing.isPresent());
    }

    private Subject replaceContent(Subject existing, SubjectImportFile file, boolean replace) {
        if (!replace) {
            throw new ImportValidationException(List.of("Môn '" + existing.getSlug() + "' đã có trong database. "
                    + "Chạy lại với --replace để thay toàn bộ nội dung môn này."));
        }
        Long subjectId = existing.getId();
        questionRepository.deleteAllBySubjectId(subjectId);
        chapterRepository.deleteAllBySubjectId(subjectId);
        // Lệnh xoá hàng loạt đã làm trống persistence context, nên đọc lại môn trước khi sửa.
        Subject subject = subjectRepository.findById(subjectId).orElseThrow();
        return SubjectImportMapper.applyTo(subject, file.subject());
    }

    /** Trả về mọi lỗi tìm được (Bean Validation + quy tắc toàn vẹn), sắp theo vị trí trong file. */
    private List<String> validate(SubjectImportFile file) {
        List<String> problems = new ArrayList<>(validator.validate(file).stream()
                .sorted(Comparator.comparing(violation -> violation.getPropertyPath().toString()))
                .map(SubjectImportService::describe)
                .toList());
        if (!problems.isEmpty()) {
            return problems; // dữ liệu thiếu trường thì các quy tắc bên dưới không kiểm tra được
        }

        Set<Integer> chapterOrders = new HashSet<>();
        for (int c = 0; c < file.chapters().size(); c++) {
            ChapterData chapter = file.chapters().get(c);
            if (!chapterOrders.add(chapter.displayOrder())) {
                problems.add("chapters[" + c + "].displayOrder: trùng thứ tự " + chapter.displayOrder());
            }
            for (int q = 0; q < chapter.questions().size(); q++) {
                checkQuestion(chapter.questions().get(q), "chapters[" + c + "].questions[" + q + "]", problems);
            }
        }
        return problems;
    }

    /** Quy tắc toàn vẹn của câu hỏi (docs/database-design.md, mục 4.4). */
    private static void checkQuestion(QuestionData question, String path, List<String> problems) {
        String where = path + labelOf(question);
        long correctCount = question.answers().stream().filter(answer -> Boolean.TRUE.equals(answer.correct())).count();

        if (question.answers().size() < 2) {
            problems.add(where + ": cần ít nhất 2 phương án");
        }
        if (question.type() == QuestionType.SINGLE_CHOICE && correctCount > 1) {
            problems.add(where + ": câu một đáp án nhưng có " + correctCount + " phương án đúng");
        }
        if (question.status() == QuestionStatus.PUBLISHED && correctCount != 1) {
            problems.add(where + ": câu PUBLISHED phải có đúng 1 phương án đúng (đang có " + correctCount + ")");
        }
    }

    private static String labelOf(QuestionData question) {
        return question.source() != null && question.source().label() != null
                ? " (" + question.source().label() + ")"
                : "";
    }

    private static String describe(ConstraintViolation<SubjectImportFile> violation) {
        return violation.getPropertyPath() + ": " + violation.getMessage();
    }
}
