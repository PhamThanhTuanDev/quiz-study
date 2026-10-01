package com.quizstudy.controller;

import static com.quizstudy.entity.QuestionStatus.PUBLISHED;
import static com.quizstudy.testsupport.QuizFixture.correctAnswer;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.Subject;
import com.quizstudy.testsupport.QuizFixture;

import jakarta.persistence.EntityManager;

/** Test qua HTTP với database test thật: kiểm tra JSON thực sự gửi cho người học. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AttemptControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    private Question question;
    private Long practiceQuizId;
    private Long examQuizId;

    @BeforeEach
    void createQuiz() {
        QuizFixture fixture = new QuizFixture(entityManager);
        Subject subject = fixture.subject("mon-api", true);
        Chapter chapter = fixture.chapter(subject, "Bài 1", 1);
        question = fixture.question(chapter, "Câu duy nhất", PUBLISHED, 2);
        practiceQuizId = fixture.quiz(subject, chapter, QuizMode.PRACTICE, 20, null).getId();
        examQuizId = fixture.quiz(subject, null, QuizMode.EXAM, 40, 45).getId();
        entityManager.flush();
    }

    @Test
    void exam_revealsCorrectAnswersOnlyAfterSubmitting() throws Exception {
        String body = mockMvc.perform(post("/api/v1/quizzes/{id}/attempts", examQuizId))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String attemptId = JsonPath.read(body, "$.id");
        mockMvc.perform(get("/api/v1/attempts/{id}", attemptId))
                .andExpect(content().string(not(containsString("orrect"))));

        mockMvc.perform(post("/api/v1/attempts/{id}/submit", attemptId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.result.unansweredCount").value(1))
                .andExpect(jsonPath("$.questions[0].selectedAnswerId").doesNotExist())
                .andExpect(jsonPath("$.questions[0].feedback.correct").value(false))
                .andExpect(jsonPath("$.questions[0].feedback.correctAnswerId").value(correctAnswer(question).getId()));
    }

    @Test
    void startAttempt_returns201WithLocation_andNeverSendsWhichAnswerIsCorrect() throws Exception {
        String body = mockMvc.perform(post("/api/v1/quizzes/{id}/attempts", practiceQuizId))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/v1/attempts/")))
                .andExpect(jsonPath("$.mode").value("PRACTICE"))
                .andExpect(jsonPath("$.questions.length()").value(1))
                .andExpect(jsonPath("$.questions[0].content").value("Câu duy nhất"))
                .andExpect(jsonPath("$.questions[0].answers.length()").value(4))
                .andExpect(jsonPath("$.questions[0].feedback").doesNotExist())
                // Không trường nào có chữ "correct" (isCorrect, correctAnswerId…) trước khi trả lời.
                .andExpect(content().string(not(containsString("orrect"))))
                .andReturn().getResponse().getContentAsString();

        String attemptId = JsonPath.read(body, "$.id");
        mockMvc.perform(get("/api/v1/attempts/{id}", attemptId))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("orrect"))));
    }

    @Test
    void saveAnswer_inPractice_returnsTheFeedbackForThatQuestion() throws Exception {
        String attemptId = startPractice();

        mockMvc.perform(put("/api/v1/attempts/{id}/answers/{questionId}", attemptId, question.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answerId\": " + correctAnswer(question).getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectedAnswerId").value(correctAnswer(question).getId()))
                .andExpect(jsonPath("$.feedback.correct").value(true))
                .andExpect(jsonPath("$.feedback.correctAnswerId").value(correctAnswer(question).getId()));
    }

    @Test
    void saveAnswer_withoutAnAnswer_returns400WithTheFieldInVietnamese() throws Exception {
        String attemptId = startPractice();

        mockMvc.perform(put("/api/v1/attempts/{id}/answers/{questionId}", attemptId, question.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("answerId"))
                .andExpect(jsonPath("$.errors[0].message").value("Chưa chọn phương án"));
    }

    @Test
    void submit_aPracticeAttempt_returns409WithAVietnameseMessage() throws Exception {
        String attemptId = startPractice();

        mockMvc.perform(post("/api/v1/attempts/{id}/submit", attemptId))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Chế độ luyện tập không cần nộp bài."));
    }

    @Test
    void getAttempt_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/attempts/{id}", "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Không tìm thấy lượt làm bài này."));
    }

    private String startPractice() throws Exception {
        String body = mockMvc.perform(post("/api/v1/quizzes/{id}/attempts", practiceQuizId))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }
}
