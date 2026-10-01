package com.quizstudy.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.QuestionStatus;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    List<Chapter> findBySubjectIdOrderByDisplayOrderAsc(Long subjectId);

    /**
     * Các bài của một môn theo thứ tự, kèm số câu ở trạng thái {@code questionStatus}.
     * Dùng left join để bài chưa có câu nào vẫn xuất hiện (số câu = 0).
     */
    @Query("""
            select new com.quizstudy.repository.ChapterSummaryRow(
                c.id, c.code, c.title, c.displayOrder, count(q))
            from Chapter c
            left join Question q on q.chapter = c and q.status = :questionStatus
            where c.subject.id = :subjectId
            group by c.id, c.code, c.title, c.displayOrder
            order by c.displayOrder
            """)
    List<ChapterSummaryRow> findSummariesBySubjectId(@Param("subjectId") Long subjectId,
            @Param("questionStatus") QuestionStatus questionStatus);
}
