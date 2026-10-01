package com.quizstudy.repository;

import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.quizstudy.entity.UserAnswer;

public interface UserAnswerRepository extends JpaRepository<UserAnswer, Long> {

    /**
     * Các câu của một lượt làm theo thứ tự, nạp sẵn câu hỏi và phương án đã chọn trong một truy vấn.
     * Phương án của các câu hỏi nạp riêng bằng {@link QuestionRepository#findWithAnswersByIdIn}: nạp chung
     * hai danh sách lồng nhau trong một truy vấn sẽ nhân số dòng (và Hibernate không cho phép với List).
     */
    @Query("select ua from UserAnswer ua join fetch ua.question left join fetch ua.selectedAnswer "
            + "where ua.quizResult.id = :quizResultId order by ua.questionOrder")
    List<UserAnswer> findWithQuestionByQuizResultId(@Param("quizResultId") Long quizResultId);

    /** Id các câu hỏi của một môn đã xuất hiện trong ít nhất một lượt làm (import không được xoá các câu này). */
    @Query("select distinct ua.question.id from UserAnswer ua where ua.question.chapter.subject.id = :subjectId")
    Set<Long> findUsedQuestionIdsBySubjectId(@Param("subjectId") Long subjectId);
}
