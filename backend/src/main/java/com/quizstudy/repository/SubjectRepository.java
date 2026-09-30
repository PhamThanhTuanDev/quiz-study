package com.quizstudy.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Subject;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    Optional<Subject> findBySlug(String slug);

    Optional<Subject> findBySlugAndPublishedTrue(String slug);

    /**
     * Các môn đã publish kèm số bài và số câu ở trạng thái {@code questionStatus}, trong một truy vấn.
     */
    @Query("""
            select new com.quizstudy.repository.SubjectSummaryRow(
                s.slug, s.name, s.code, s.description,
                (select count(c) from Chapter c where c.subject = s),
                (select count(q) from Question q where q.chapter.subject = s and q.status = :questionStatus))
            from Subject s
            where s.published = true
            order by s.displayOrder, s.name
            """)
    List<SubjectSummaryRow> findPublishedSummaries(@Param("questionStatus") QuestionStatus questionStatus);
}
