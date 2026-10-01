package com.quizstudy.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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

    /** Id các câu của một chương theo trạng thái (chỉ lấy id để rút ngẫu nhiên, không nạp nội dung). */
    @Query("select q.id from Question q where q.chapter.id = :chapterId and q.status = :status")
    List<Long> findIdsByChapterIdAndStatus(@Param("chapterId") Long chapterId, @Param("status") QuestionStatus status);

    /** Id các câu của cả môn theo trạng thái. */
    @Query("select q.id from Question q where q.chapter.subject.id = :subjectId and q.status = :status")
    List<Long> findIdsBySubjectIdAndStatus(@Param("subjectId") Long subjectId, @Param("status") QuestionStatus status);

    /** Các câu theo id, kèm phương án, trong một truy vấn (tránh N+1 khi hiển thị một lượt làm). */
    @EntityGraph(attributePaths = "answers")
    List<Question> findWithAnswersByIdIn(Collection<Long> ids);

    /** Mọi câu của một môn (mọi trạng thái), kèm phương án; dùng khi import lại để khớp câu cũ với câu mới. */
    @EntityGraph(attributePaths = "answers")
    @Query("select q from Question q where q.chapter.subject.id = :subjectId")
    List<Question> findWithAnswersBySubjectId(@Param("subjectId") Long subjectId);
}
