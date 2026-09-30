package com.quizstudy.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.quizstudy.entity.Chapter;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    List<Chapter> findBySubjectIdOrderByDisplayOrderAsc(Long subjectId);
}
