package com.quizstudy.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.quizstudy.dto.StudyChapterResponse;
import com.quizstudy.dto.StudyChapterResponse.StudyAnswerResponse;
import com.quizstudy.dto.StudyChapterResponse.StudyQuestionResponse;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.service.StudyService;

@WebMvcTest(StudyController.class)
class StudyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StudyService studyService;

    @Test
    void getStudyChapter_returnsQuestionsWithTheCorrectAnswer() throws Exception {
        when(studyService.getChapter("python", 40L)).thenReturn(new StudyChapterResponse(
                "python", "Nhập môn lập trình Python", 40L, "Bài 4", "Cấu trúc lặp",
                List.of(new StudyQuestionResponse(9L, 1, "Kết quả của 7 // 2?", null,
                        List.of(new StudyAnswerResponse(1L, "3.5", false, null),
                                new StudyAnswerResponse(2L, "3", true, List.of("3"))),
                        null))));

        mockMvc.perform(get("/api/v1/subjects/python/chapters/40/study"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chapterTitle").value("Cấu trúc lặp"))
                .andExpect(jsonPath("$.questions[0].order").value(1))
                .andExpect(jsonPath("$.questions[0].answers[0].correct").value(false))
                .andExpect(jsonPath("$.questions[0].answers[1].content").value("3"))
                .andExpect(jsonPath("$.questions[0].answers[1].correct").value(true))
                .andExpect(jsonPath("$.questions[0].answers[0].blanks").isEmpty())
                .andExpect(jsonPath("$.questions[0].answers[1].blanks[0]").value("3"));
    }

    @Test
    void getStudyChapter_returns404ProblemDetail_forAnUnknownChapter() throws Exception {
        when(studyService.getChapter("python", 99L))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy bài học này."));

        mockMvc.perform(get("/api/v1/subjects/python/chapters/99/study"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Không tìm thấy bài học này."));
    }
}
