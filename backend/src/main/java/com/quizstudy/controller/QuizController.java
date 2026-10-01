package com.quizstudy.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.quizstudy.dto.QuizSummaryResponse;
import com.quizstudy.service.QuizService;

@RestController
@RequestMapping("/api/v1/subjects/{slug}/quizzes")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @GetMapping
    public ResponseEntity<List<QuizSummaryResponse>> listQuizzes(@PathVariable String slug) {
        return ResponseEntity.ok(quizService.listForSubject(slug));
    }
}
