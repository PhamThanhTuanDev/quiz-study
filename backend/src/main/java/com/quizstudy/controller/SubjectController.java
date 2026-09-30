package com.quizstudy.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.quizstudy.dto.SubjectDetailResponse;
import com.quizstudy.dto.SubjectSummaryResponse;
import com.quizstudy.service.SubjectService;

@RestController
@RequestMapping("/api/v1/subjects")
public class SubjectController {

    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @GetMapping
    public ResponseEntity<List<SubjectSummaryResponse>> listSubjects() {
        return ResponseEntity.ok(subjectService.listPublishedSubjects());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<SubjectDetailResponse> getSubject(@PathVariable String slug) {
        return ResponseEntity.ok(subjectService.getPublishedSubject(slug));
    }
}
