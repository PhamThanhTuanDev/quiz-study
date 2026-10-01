package com.quizstudy.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.quizstudy.entity.Quiz;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    /** Các đề đã publish của một môn, nạp sẵn bài (chapter) để hiển thị tên bài, tránh N+1. */
    @EntityGraph(attributePaths = "chapter")
    List<Quiz> findBySubjectIdAndPublishedTrueOrderByIdAsc(Long subjectId);

    /** Mọi đề của một môn (kể cả chưa publish), dùng khi import tạo/cập nhật đề mặc định. */
    @EntityGraph(attributePaths = "chapter")
    List<Quiz> findBySubjectId(Long subjectId);

    /** Các đề giới hạn trong một bài (import xoá chúng khi bài không còn trong tài liệu). */
    List<Quiz> findByChapterId(Long chapterId);
}
