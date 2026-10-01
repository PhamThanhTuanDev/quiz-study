package com.quizstudy.controller;

import static com.quizstudy.entity.QuestionStatus.NEEDS_REVIEW;
import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.Subject;
import com.quizstudy.testsupport.QuizFixture;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class QuizControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Test
    void listQuizzes_putsTheSubjectExamFirst_thenChaptersInOrder_withTheRealNumberOfQuestions() throws Exception {
        QuizFixture fixture = new QuizFixture(entityManager);
        Subject subject = fixture.subject("mon-de", true);
        Chapter second = fixture.chapter(subject, "Bài 2", 2);
        Chapter first = fixture.chapter(subject, "Bài 1", 1);
        fixture.question(first, "Câu 1", PUBLISHED, 0);
        fixture.question(first, "Câu 2", PUBLISHED, 0);
        fixture.question(first, "Câu chờ duyệt", NEEDS_REVIEW, 0);
        fixture.question(second, "Câu 3", PUBLISHED, 0);
        fixture.quiz(subject, second, QuizMode.PRACTICE, 20, null);
        fixture.quiz(subject, first, QuizMode.PRACTICE, 20, null);
        fixture.quiz(subject, null, QuizMode.EXAM, 40, 45);
        entityManager.flush();

        mockMvc.perform(get("/api/v1/subjects/{slug}/quizzes", "mon-de"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].mode").value("EXAM"))
                .andExpect(jsonPath("$[0].chapterId").doesNotExist())
                .andExpect(jsonPath("$[0].questionCount").value(3))
                .andExpect(jsonPath("$[0].timeLimitMinutes").value(45))
                .andExpect(jsonPath("$[1].chapterTitle").value("Bài 1"))
                .andExpect(jsonPath("$[1].questionCount").value(2))
                .andExpect(jsonPath("$[2].chapterTitle").value("Bài 2"))
                .andExpect(jsonPath("$[2].questionCount").value(1));
    }

    @Test
    void listQuizzes_ofAnUnknownSubject_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/subjects/{slug}/quizzes", "khong-co-mon-nay"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Không tìm thấy môn học này."));
    }
}
