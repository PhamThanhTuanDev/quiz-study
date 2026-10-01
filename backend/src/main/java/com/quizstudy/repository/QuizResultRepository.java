package com.quizstudy.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.quizstudy.entity.QuizResult;

import jakarta.persistence.LockModeType;

public interface QuizResultRepository extends JpaRepository<QuizResult, Long> {

    /** Đọc một lượt làm theo mã trên URL, nạp sẵn đề và môn. */
    @EntityGraph(attributePaths = { "quiz", "quiz.subject" })
    Optional<QuizResult> findByPublicId(String publicId);

    /**
     * Đọc một lượt làm và khoá dòng đó (SELECT … FOR UPDATE) tới hết transaction.
     * Dùng khi ghi (lưu lựa chọn, nộp bài) để hai yêu cầu cùng lúc trên một lượt làm không chen nhau,
     * ví dụ lưu lựa chọn đúng lúc bài vừa được nộp.
     * Không join sang đề: khoá chỉ nằm trên dòng của lượt làm này, người khác làm cùng đề không phải chờ.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from QuizResult r where r.publicId = :publicId")
    Optional<QuizResult> findForUpdateByPublicId(@Param("publicId") String publicId);

    /** Đã có lượt làm nào của một đề thuộc bài này chưa (import không được xoá bài và đề khi đã có). */
    boolean existsByQuizChapterId(Long chapterId);
}
