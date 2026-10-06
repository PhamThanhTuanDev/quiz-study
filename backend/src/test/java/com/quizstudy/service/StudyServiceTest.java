package com.quizstudy.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.quizstudy.dto.StudyChapterResponse;
import com.quizstudy.dto.StudyChapterResponse.StudyAnswerResponse;
import com.quizstudy.dto.StudyChapterResponse.StudyQuestionResponse;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.QuestionType;
import com.quizstudy.entity.Subject;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.repository.ChapterRepository;
import com.quizstudy.repository.QuestionRepository;
import com.quizstudy.repository.SubjectRepository;

@ExtendWith(MockitoExtension.class)
class StudyServiceTest {

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private QuestionRepository questionRepository;

    @InjectMocks
    private StudyService studyService;

    private Subject python;

    @BeforeEach
    void createSubject() {
        python = new Subject("python", "Nhập môn lập trình Python");
        ReflectionTestUtils.setField(python, "id", 7L);
    }

    @Test
    void getChapter_returnsQuestionsInOrder_withTheCorrectAnswerMarked_andTheExplanation() {
        Chapter chapter = new Chapter(python, "Cấu trúc lặp", 4);
        chapter.setCode("Bài 4");
        ReflectionTestUtils.setField(chapter, "id", 40L);
        Question first = question(chapter, "Kết quả của 7 // 2?", "3.5", "3");
        Question second = question(chapter, "range(3) có mấy số?", "2", "3");
        second.setCodeSnippet("print(len(range(3)))");
        second.setExplanation("Đã sửa so với tài liệu: thêm lệnh print.");
        when(subjectRepository.findBySlugAndPublishedTrue("python")).thenReturn(Optional.of(python));
        when(chapterRepository.findByIdAndSubjectId(40L, 7L)).thenReturn(Optional.of(chapter));
        when(questionRepository.findByChapterIdAndStatusOrderByIdAsc(40L, QuestionStatus.PUBLISHED))
                .thenReturn(List.of(first, second));

        StudyChapterResponse study = studyService.getChapter("python", 40L);

        assertThat(study.subjectSlug()).isEqualTo("python");
        assertThat(study.subjectName()).isEqualTo("Nhập môn lập trình Python");
        assertThat(study.chapterCode()).isEqualTo("Bài 4");
        assertThat(study.chapterTitle()).isEqualTo("Cấu trúc lặp");
        assertThat(study.questions())
                .extracting(StudyQuestionResponse::order, StudyQuestionResponse::content,
                        StudyQuestionResponse::codeSnippet, StudyQuestionResponse::explanation)
                .containsExactly(
                        tuple(1, "Kết quả của 7 // 2?", null, null),
                        tuple(2, "range(3) có mấy số?", "print(len(range(3)))",
                                "Đã sửa so với tài liệu: thêm lệnh print."));
        // Giữ thứ tự phương án như tài liệu (A, B…), không xáo.
        assertThat(study.questions().getFirst().answers())
                .extracting(StudyAnswerResponse::content, StudyAnswerResponse::correct)
                .containsExactly(tuple("3.5", false), tuple("3", true));
        verify(questionRepository).findByChapterIdAndStatusOrderByIdAsc(40L, QuestionStatus.PUBLISHED);
    }

    @Test
    void getChapter_throwsNotFound_forAnUnknownOrUnpublishedSubject() {
        when(subjectRepository.findBySlugAndPublishedTrue("java")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studyService.getChapter("java", 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Không tìm thấy môn học này.");
    }

    @Test
    void getChapter_throwsNotFound_whenTheChapterBelongsToAnotherSubject() {
        when(subjectRepository.findBySlugAndPublishedTrue("python")).thenReturn(Optional.of(python));
        when(chapterRepository.findByIdAndSubjectId(99L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studyService.getChapter("python", 99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Không tìm thấy bài học này.");
    }

    /** Câu 2 phương án, phương án thứ hai là đáp án đúng. */
    private static Question question(Chapter chapter, String content, String wrong, String right) {
        Question question = new Question(chapter, QuestionType.SINGLE_CHOICE, content, QuestionStatus.PUBLISHED);
        question.addAnswer(wrong, false);
        question.addAnswer(right, true);
        return question;
    }
}
