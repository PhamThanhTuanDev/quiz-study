package com.quizstudy.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.quizstudy.dto.AttemptResponse;
import com.quizstudy.dto.SaveAnswerRequest;
import com.quizstudy.dto.SaveAnswerResponse;
import com.quizstudy.service.AttemptService;

import jakarta.validation.Valid;

/** Lượt làm bài. {@code attemptId} là mã UUID của lượt làm, không phải id tăng dần trong database. */
@RestController
@RequestMapping("/api/v1")
public class AttemptController {

    private final AttemptService attemptService;

    public AttemptController(AttemptService attemptService) {
        this.attemptService = attemptService;
    }

    @PostMapping("/quizzes/{quizId}/attempts")
    public ResponseEntity<AttemptResponse> startAttempt(@PathVariable Long quizId) {
        AttemptResponse attempt = attemptService.start(quizId);
        return ResponseEntity.created(URI.create("/api/v1/attempts/" + attempt.id())).body(attempt);
    }

    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<AttemptResponse> getAttempt(@PathVariable String attemptId) {
        return ResponseEntity.ok(attemptService.get(attemptId));
    }

    @PutMapping("/attempts/{attemptId}/answers/{questionId}")
    public ResponseEntity<SaveAnswerResponse> saveAnswer(@PathVariable String attemptId, @PathVariable Long questionId,
            @Valid @RequestBody SaveAnswerRequest request) {
        return ResponseEntity.ok(attemptService.saveAnswer(attemptId, questionId, request.answerId()));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<AttemptResponse> submitAttempt(@PathVariable String attemptId) {
        return ResponseEntity.ok(attemptService.submit(attemptId));
    }
}
