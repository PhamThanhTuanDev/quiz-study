package com.quizstudy.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.StudyChapterResponse;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.mapper.StudyMapper;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.QuestionRepository;
import com.quizstudy.repository.SubjectRepository;

/**
 * Chế độ "Học" (D-044): trả câu hỏi của một bài kèm đáp án đúng để đọc. Khác với bài làm (luyện tập / thi thử),
 * vốn không bao giờ lộ đáp án trước khi trả lời; đây là API riêng, người học chủ động chọn xem đáp án.
 */
@Service
@Transactional(readOnly = true)
public class StudyService {

    private final SubjectRepository subjectRepository;
    private final ChapterRepository chapterRepository;
    private final QuestionRepository questionRepository;

    public StudyService(SubjectRepository subjectRepository, ChapterRepository chapterRepository,
            QuestionRepository questionRepository) {
        this.subjectRepository = subjectRepository;
        this.chapterRepository = chapterRepository;
        this.questionRepository = questionRepository;
    }

    /** @throws ResourceNotFoundException nếu môn không có / chưa publish, hoặc bài không thuộc môn này */
    public StudyChapterResponse getChapter(String subjectSlug, Long chapterId) {
        Subject subject = subjectRepository.findBySlugAndPublishedTrue(subjectSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học này."));
        Chapter chapter = chapterRepository.findByIdAndSubjectId(chapterId, subject.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài học này."));
        // Chỉ câu PUBLISHED, như bài làm. Theo id = theo thứ tự import (thứ tự trong tài liệu).
        return StudyMapper.toStudyChapter(chapter,
                questionRepository.findByChapterIdAndStatusOrderByIdAsc(chapter.getId(), QuestionStatus.PUBLISHED));
    }
}
