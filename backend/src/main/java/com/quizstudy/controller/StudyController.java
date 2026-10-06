package com.quizstudy.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.quizstudy.dto.StudyChapterResponse;
import com.quizstudy.service.StudyService;

@RestController
@RequestMapping("/api/v1/subjects/{slug}/chapters/{chapterId}/study")
public class StudyController {

    private final StudyService studyService;

    public StudyController(StudyService studyService) {
        this.studyService = studyService;
    }

    @GetMapping
    public ResponseEntity<StudyChapterResponse> getStudyChapter(@PathVariable String slug,
            @PathVariable Long chapterId) {
        return ResponseEntity.ok(studyService.getChapter(slug, chapterId));
    }
}
