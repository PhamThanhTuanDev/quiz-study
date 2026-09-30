package com.quizstudy.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
