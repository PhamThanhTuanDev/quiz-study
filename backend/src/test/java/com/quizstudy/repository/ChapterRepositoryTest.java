package com.quizstudy.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Subject;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ChapterRepositoryTest {

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findBySubjectId_returnsOnlyChaptersOfThatSubject_inDisplayOrder() {
        Subject python = entityManager.persist(new Subject("python", "Nhập môn lập trình Python"));
        Subject gdqp = entityManager.persist(new Subject("gdqp", "Giáo dục quốc phòng và an ninh"));
        // Thêm lệch thứ tự để chắc kết quả được sắp theo display_order, không theo thứ tự thêm.
        entityManager.persist(new Chapter(python, "Hàm", 4));
        entityManager.persist(new Chapter(python, "Giới thiệu", 1));
        entityManager.persist(new Chapter(gdqp, "Bài 1", 1));
        entityManager.persist(new Chapter(python, "Cấu trúc lặp", 2));
        entityManager.flush();
        entityManager.clear();

        List<Chapter> chapters = chapterRepository.findBySubjectIdOrderByDisplayOrderAsc(python.getId());

        assertThat(chapters)
                .extracting(Chapter::getTitle)
                .containsExactly("Giới thiệu", "Cấu trúc lặp", "Hàm");
    }
}
