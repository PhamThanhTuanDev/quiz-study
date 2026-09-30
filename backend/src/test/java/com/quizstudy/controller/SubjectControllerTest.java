package com.quizstudy.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
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

import com.quizstudy.dto.ChapterSummaryResponse;
import com.quizstudy.dto.SubjectDetailResponse;
import com.quizstudy.dto.SubjectSummaryResponse;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.service.SubjectService;

@WebMvcTest(SubjectController.class)
class SubjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SubjectService subjectService;

    @Test
    void listSubjects_returnsPublishedSubjectsWithCounts() throws Exception {
        when(subjectService.listPublishedSubjects()).thenReturn(List.of(
                new SubjectSummaryResponse("gdqp", "Giáo dục quốc phòng và an ninh", null, null, 11, 230)));

        mockMvc.perform(get("/api/v1/subjects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].slug").value("gdqp"))
                .andExpect(jsonPath("$[0].name").value("Giáo dục quốc phòng và an ninh"))
                .andExpect(jsonPath("$[0].chapterCount").value(11))
                .andExpect(jsonPath("$[0].questionCount").value(230));
    }

    @Test
    void getSubject_returnsTheChapters_withoutAnyQuestionOrAnswer() throws Exception {
        when(subjectService.getPublishedSubject("gdqp")).thenReturn(new SubjectDetailResponse(
                "gdqp", "Giáo dục quốc phòng và an ninh", null, null, 6,
                List.of(new ChapterSummaryResponse(1, "Bài 1", "Đối tượng, nhiệm vụ", 1, 6))));

        mockMvc.perform(get("/api/v1/subjects/gdqp"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questionCount").value(6))
                .andExpect(jsonPath("$.chapters[0].code").value("Bài 1"))
                .andExpect(jsonPath("$.chapters[0].title").value("Đối tượng, nhiệm vụ"))
                .andExpect(jsonPath("$.chapters[0].questionCount").value(6))
                .andExpect(content().string(not(containsString("correct"))));
    }

    @Test
    void getSubject_returns404ProblemDetail_forAnUnknownSubject() throws Exception {
        when(subjectService.getPublishedSubject("java"))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy môn học này."));

        mockMvc.perform(get("/api/v1/subjects/java"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Không tìm thấy môn học này."));
    }
}
