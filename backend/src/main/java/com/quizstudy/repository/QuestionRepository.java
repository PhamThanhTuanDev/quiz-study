package com.quizstudy.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    /**
     * Câu hỏi của một chương theo trạng thái, kèm luôn phương án.
     * {@code @EntityGraph} nạp phương án trong cùng một truy vấn, tránh N+1
     * (mỗi câu hỏi lại phải truy vấn thêm một lần để lấy phương án).
     */
    @EntityGraph(attributePaths = "answers")
    List<Question> findByChapterIdAndStatusOrderByIdAsc(Long chapterId, QuestionStatus status);

    /**
     * Xoá mọi câu hỏi của một môn trong một câu lệnh (dùng khi import thay toàn bộ môn).
     * Phương án bị xoá theo nhờ khoá ngoại ON DELETE CASCADE trong database.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Question q where q.chapter.id in (select c.id from Chapter c where c.subject.id = :subjectId)")
    int deleteAllBySubjectId(@Param("subjectId") Long subjectId);
}
