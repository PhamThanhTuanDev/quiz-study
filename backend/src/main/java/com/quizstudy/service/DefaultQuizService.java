package com.quizstudy.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.config.QuizDefaultsProperties;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.Subject;
import com.quizstudy.repository.QuizRepository;

/**
 * Đề mặc định của một môn, tạo và cập nhật mỗi lần import: mỗi bài một đề luyện tập, cả môn một đề thi thử.
 * Số câu và thời gian lấy từ {@link QuizDefaultsProperties}, giống nhau cho mọi môn.
 *
 * <p>Hiện mọi đề đều do hệ thống tạo nên khớp đề theo (chế độ, bài). Khi có đề do người dùng tạo (Phase 8),
 * phải khớp thêm {@code created_by IS NULL} để import không ghi đè đề của họ.
 */
@Service
public class DefaultQuizService {

    static final String PRACTICE_TITLE_PREFIX = "Luyện tập: ";
    static final String EXAM_TITLE_PREFIX = "Thi thử: ";
    private static final int MAX_TITLE_LENGTH = 255;

    private final QuizRepository quizRepository;
    private final QuizDefaultsProperties defaults;

    public DefaultQuizService(QuizRepository quizRepository, QuizDefaultsProperties defaults) {
        this.quizRepository = quizRepository;
        this.defaults = defaults;
    }

    /** Chạy trong transaction của import. {@code chapters}: các bài hiện có của môn (đã lưu). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void syncDefaults(Subject subject, List<Chapter> chapters) {
        List<Quiz> existing = quizRepository.findBySubjectId(subject.getId());
        Map<Long, Quiz> practiceByChapterId = existing.stream()
                .filter(quiz -> quiz.getMode() == QuizMode.PRACTICE && quiz.getChapter() != null)
                // Một bài có nhiều đề luyện tập (sau này có đề người dùng tạo) thì cập nhật đề đầu tiên.
                .collect(Collectors.toMap(quiz -> quiz.getChapter().getId(), Function.identity(), (first, second) -> first));

        for (Chapter chapter : chapters) {
            save(practiceByChapterId.get(chapter.getId()), subject, chapter, QuizMode.PRACTICE,
                    title(PRACTICE_TITLE_PREFIX, chapter.getTitle()), defaults.practiceQuestionCount(), null);
        }

        Optional<Quiz> exam = existing.stream()
                .filter(quiz -> quiz.getMode() == QuizMode.EXAM && quiz.getChapter() == null)
                .findFirst();
        save(exam.orElse(null), subject, null, QuizMode.EXAM, title(EXAM_TITLE_PREFIX, subject.getName()),
                defaults.examQuestionCount(), defaults.examTimeLimitMinutes());
    }

    /** Cập nhật đề có sẵn ({@code existing}), hoặc tạo mới nếu chưa có. */
    private void save(Quiz existing, Subject subject, Chapter chapter, QuizMode mode, String title,
            int questionCount, Integer timeLimitMinutes) {
        Quiz quiz = existing != null ? existing : new Quiz(subject, chapter, title, mode, questionCount);
        quiz.setTitle(title);
        quiz.setQuestionCount(questionCount);
        quiz.setTimeLimitMinutes(timeLimitMinutes);
        quiz.setShuffleQuestions(true);
        // Đề chỉ hiện khi môn được publish (API đề đi qua môn), nên đề mặc định luôn publish.
        quiz.setPublished(true);
        quizRepository.save(quiz);
    }

    /** Tên bài dài gần 255 ký tự thì cắt bớt để tên đề vẫn vừa cột {@code quizzes.title}. */
    private static String title(String prefix, String name) {
        String full = prefix + name;
        return full.length() <= MAX_TITLE_LENGTH ? full : full.substring(0, MAX_TITLE_LENGTH - 1) + "…";
    }
}
