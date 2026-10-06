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
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.QuestionType;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ImportValidationException;
import com.quizstudy.mapper.SubjectImportMapper;
import com.quizstudy.repository.SubjectRepository;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

/**
 * Import một môn từ file JSON đã được chủ dự án duyệt.
 * Kiểm tra toàn bộ file trước, rồi ghi tất cả trong một transaction: hoặc thành công hết, hoặc không ghi gì.
 * Môn đã có thì cập nhật theo nguồn câu hỏi, an toàn với các lượt làm bài đã có ({@link SubjectContentUpdater}).
 */
@Service
public class SubjectImportService {

    private final SubjectRepository subjectRepository;
    private final SubjectContentUpdater contentUpdater;
    private final DefaultQuizService defaultQuizService;
    private final Validator validator;

    public SubjectImportService(SubjectRepository subjectRepository, SubjectContentUpdater contentUpdater,
            DefaultQuizService defaultQuizService, Validator validator) {
        this.subjectRepository = subjectRepository;
        this.contentUpdater = contentUpdater;
        this.defaultQuizService = defaultQuizService;
        this.validator = validator;
    }

    /**
     * @param replace true: nếu môn đã có thì cập nhật môn đó theo file (câu đã có người làm không bị xoá).
     *                false: môn đã có thì dừng, tránh vô tình ghi đè.
     * @throws ImportValidationException nếu file có lỗi, môn đã có mà không chọn replace,
     *                                   hoặc có câu/bài không cập nhật được an toàn
     */
    @Transactional
    public SubjectImportResult importSubject(SubjectImportFile file, boolean replace) {
        List<String> problems = validate(file);
        if (!problems.isEmpty()) {
            throw new ImportValidationException(problems);
        }

        Optional<Subject> existing = subjectRepository.findBySlug(file.subject().slug());
        if (existing.isPresent() && !replace) {
            throw new ImportValidationException(List.of("Môn '" + existing.get().getSlug() + "' đã có trong database. "
                    + "Chạy lại với --replace để cập nhật môn này."));
        }
        Subject subject = existing
                .map(found -> SubjectImportMapper.applyTo(found, file.subject()))
                .orElseGet(() -> subjectRepository.save(SubjectImportMapper.toNewSubject(file.subject())));

        SubjectContentUpdater.Result content = contentUpdater.update(subject, file.chapters());
        defaultQuizService.syncDefaults(subject, content.chapters());

        List<QuestionData> questions = file.chapters().stream().flatMap(chapter -> chapter.questions().stream()).toList();
        long publishedCount = questions.stream().filter(question -> question.status() == QuestionStatus.PUBLISHED).count();
        return new SubjectImportResult(subject.getSlug(), file.chapters().size(), questions.size(), (int) publishedCount,
                existing.isPresent(), content.archivedCount(), content.removedCount());
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
        Set<List<String>> sources = new HashSet<>();
        for (int c = 0; c < file.chapters().size(); c++) {
            ChapterData chapter = file.chapters().get(c);
            if (!chapterOrders.add(chapter.displayOrder())) {
                problems.add("chapters[" + c + "].displayOrder: trùng thứ tự " + chapter.displayOrder());
            }
            for (int q = 0; q < chapter.questions().size(); q++) {
                QuestionData question = chapter.questions().get(q);
                String path = "chapters[" + c + "].questions[" + q + "]";
                checkQuestion(question, path, problems);
                // Nguồn là khoá để import lại khớp câu cũ với câu mới, nên không được trùng.
                if (!sources.add(List.of(question.source().file(), question.source().label()))) {
                    problems.add(path + labelOf(question) + ": trùng nguồn (file + nhãn) với một câu khác");
                }
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
        return " (" + question.source().label() + ")";
    }

    private static String describe(ConstraintViolation<SubjectImportFile> violation) {
        // Ràng buộc trên phần tử của danh sách chuỗi (ví dụ blanks[1]) có thêm nút "<list element>"; bỏ đi cho dễ đọc.
        String path = violation.getPropertyPath().toString().replace(".<list element>", "");
        return path + ": " + violation.getMessage();
    }
}
