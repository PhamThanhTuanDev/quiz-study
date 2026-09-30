package com.quizstudy.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.quizstudy.dto.ChapterSummaryResponse;
import com.quizstudy.dto.SubjectDetailResponse;
import com.quizstudy.dto.SubjectSummaryResponse;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.ChapterSummaryRow;
import com.quizstudy.repository.SubjectRepository;
import com.quizstudy.repository.SubjectSummaryRow;

@ExtendWith(MockitoExtension.class)
class SubjectServiceTest {

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @InjectMocks
    private SubjectService subjectService;

    @Test
    void listPublishedSubjects_countsOnlyPublishedQuestions() {
        when(subjectRepository.findPublishedSummaries(any())).thenReturn(List.of(
                new SubjectSummaryRow("gdqp", "Giáo dục quốc phòng và an ninh", null, null, 11L, 230L)));

        List<SubjectSummaryResponse> subjects = subjectService.listPublishedSubjects();

        assertThat(subjects).containsExactly(
                new SubjectSummaryResponse("gdqp", "Giáo dục quốc phòng và an ninh", null, null, 11, 230));
        verify(subjectRepository).findPublishedSummaries(QuestionStatus.PUBLISHED);
    }

    @Test
    void getPublishedSubject_returnsChaptersInOrder_andTheTotalQuestionCount() {
        Subject subject = new Subject("gdqp", "Giáo dục quốc phòng và an ninh");
        ReflectionTestUtils.setField(subject, "id", 7L);
        when(subjectRepository.findBySlugAndPublishedTrue("gdqp")).thenReturn(Optional.of(subject));
        when(chapterRepository.findSummariesBySubjectId(7L, QuestionStatus.PUBLISHED)).thenReturn(List.of(
                new ChapterSummaryRow(1L, "Bài 1", "Đối tượng, nhiệm vụ", 1, 6L),
                new ChapterSummaryRow(2L, "Bài 2", "Quan điểm cơ bản", 2, 30L)));

        SubjectDetailResponse detail = subjectService.getPublishedSubject("gdqp");

        assertThat(detail.slug()).isEqualTo("gdqp");
        assertThat(detail.questionCount()).isEqualTo(36);
        assertThat(detail.chapters()).containsExactly(
                new ChapterSummaryResponse(1, "Bài 1", "Đối tượng, nhiệm vụ", 1, 6),
                new ChapterSummaryResponse(2, "Bài 2", "Quan điểm cơ bản", 2, 30));
    }

    @Test
    void getPublishedSubject_throwsNotFound_forUnknownOrUnpublishedSubject() {
        when(subjectRepository.findBySlugAndPublishedTrue("java")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> subjectService.getPublishedSubject("java"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Không tìm thấy môn học này.");
    }

    @Test
    void getPublishedSubject_doesNotQueryChapters_whenTheSubjectIsMissing() {
        when(subjectRepository.findBySlugAndPublishedTrue("java")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> subjectService.getPublishedSubject("java"));

        verify(chapterRepository, never()).findSummariesBySubjectId(anyLong(), any());
    }
}
