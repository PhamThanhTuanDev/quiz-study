package com.quizstudy.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.SubjectDetailResponse;
import com.quizstudy.dto.SubjectSummaryResponse;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.mapper.SubjectMapper;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.SubjectRepository;

/**
 * Đọc môn học cho người học. Chỉ môn đã publish được hiện; số câu chỉ tính câu PUBLISHED,
 * vì chỉ những câu này được dùng trong bài làm.
 */
@Service
@Transactional(readOnly = true)
public class SubjectService {

    private static final QuestionStatus USABLE_STATUS = QuestionStatus.PUBLISHED;

    private final SubjectRepository subjectRepository;
    private final ChapterRepository chapterRepository;

    public SubjectService(SubjectRepository subjectRepository, ChapterRepository chapterRepository) {
        this.subjectRepository = subjectRepository;
        this.chapterRepository = chapterRepository;
    }

    public List<SubjectSummaryResponse> listPublishedSubjects() {
        return subjectRepository.findPublishedSummaries(USABLE_STATUS).stream()
                .map(SubjectMapper::toSummary)
                .toList();
    }

    /** @throws ResourceNotFoundException nếu không có môn này, hoặc môn chưa publish */
    public SubjectDetailResponse getPublishedSubject(String slug) {
        Subject subject = subjectRepository.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học này."));
        return SubjectMapper.toDetail(subject,
                chapterRepository.findSummariesBySubjectId(subject.getId(), USABLE_STATUS));
    }
}
