package com.quizstudy.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.QuizSummaryResponse;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.ChapterSummaryRow;
import com.quizstudy.repository.QuizRepository;
import com.quizstudy.repository.SubjectRepository;

/** Danh sách đề của một môn cho người học. */
@Service
@Transactional(readOnly = true)
public class QuizService {

    private final SubjectRepository subjectRepository;
    private final ChapterRepository chapterRepository;
    private final QuizRepository quizRepository;

    public QuizService(SubjectRepository subjectRepository, ChapterRepository chapterRepository,
            QuizRepository quizRepository) {
        this.subjectRepository = subjectRepository;
        this.chapterRepository = chapterRepository;
        this.quizRepository = quizRepository;
    }

    /**
     * Đề cả môn đứng trước, rồi các đề theo thứ tự bài. Số câu là số câu thực tế mỗi lượt
     * (ít hơn số câu của đề nếu phạm vi không đủ câu PUBLISHED).
     *
     * @throws ResourceNotFoundException nếu không có môn này, hoặc môn chưa publish
     */
    public List<QuizSummaryResponse> listForSubject(String slug) {
        Subject subject = subjectRepository.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học này."));
        Map<Long, Long> publishedPerChapter = chapterRepository
                .findSummariesBySubjectId(subject.getId(), QuestionStatus.PUBLISHED).stream()
                .collect(Collectors.toMap(ChapterSummaryRow::id, ChapterSummaryRow::questionCount));
        long publishedInSubject = publishedPerChapter.values().stream().mapToLong(Long::longValue).sum();

        return quizRepository.findBySubjectIdAndPublishedTrueOrderByIdAsc(subject.getId()).stream()
                .map(quiz -> toSummary(quiz, quiz.getChapter() == null
                        ? publishedInSubject
                        : publishedPerChapter.getOrDefault(quiz.getChapter().getId(), 0L)))
                .sorted(Comparator.comparing(QuizSummaryResponse::chapterOrder,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
    }

    private static QuizSummaryResponse toSummary(Quiz quiz, long availableQuestions) {
        Chapter chapter = quiz.getChapter();
        return new QuizSummaryResponse(quiz.getId(), quiz.getTitle(), quiz.getMode(),
                chapter == null ? null : chapter.getId(),
                chapter == null ? null : chapter.getTitle(),
                chapter == null ? null : chapter.getDisplayOrder(),
                Math.min(quiz.getQuestionCount(), availableQuestions), quiz.getTimeLimitMinutes());
    }
}
