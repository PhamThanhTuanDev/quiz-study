package com.quizstudy.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import com.quizstudy.entity.Subject;

// Chạy trên MySQL thật (database quiz_study_test), không thay bằng database nhúng.
// Mỗi test chạy trong một transaction và được rollback khi kết thúc.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class SubjectRepositoryTest {

    /** Truy vấn số giây chênh giữa created_at và giờ UTC hiện tại của MySQL. */
    private static final String SECONDS_FROM_UTC_NOW =
            "SELECT ABS(TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP(6))) FROM subjects WHERE slug = :slug";

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findBySlug_returnsSavedSubject() {
        Subject subject = new Subject("gdqp", "Giáo dục quốc phòng và an ninh");
        subject.setCode("GDQP");
        entityManager.persistAndFlush(subject);
        entityManager.clear();

        assertThat(subjectRepository.findBySlug("gdqp"))
                .get()
                .satisfies(found -> {
                    assertThat(found.getName()).isEqualTo("Giáo dục quốc phòng và an ninh");
                    assertThat(found.getCode()).isEqualTo("GDQP");
                    assertThat(found.isPublished()).isFalse();
                });
    }

    @Test
    void findBySlug_returnsEmpty_whenSlugDoesNotExist() {
        assertThat(subjectRepository.findBySlug("khong-ton-tai")).isEmpty();
    }

    @Test
    void save_rejectsDuplicateSlug() {
        subjectRepository.saveAndFlush(new Subject("python", "Nhập môn lập trình Python"));

        assertThatThrownBy(() -> subjectRepository.saveAndFlush(new Subject("python", "Tên khác")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // Kiểm tra trực tiếp cấu hình, để phát hiện lỗi cả trên máy đặt giờ UTC
    // (khi đó hai test so sánh thời gian bên dưới vẫn đạt dù cấu hình bị mất).
    @Test
    void databaseSession_usesUtcTimeZone() {
        Object sessionTimeZone = entityManager.getEntityManager()
                .createNativeQuery("SELECT @@session.time_zone")
                .getSingleResult();

        assertThat(sessionTimeZone).isIn("+00:00", "UTC");
    }

    // Trên máy đặt giờ Việt Nam, nếu thời gian bị lưu theo giờ địa phương thì hai test dưới lệch khoảng 7 tiếng.
    @Test
    void save_storesTimestampsInUtc_andReadsThemBack() {
        entityManager.persistAndFlush(new Subject("toan", "Toán"));
        entityManager.clear();

        Subject reloaded = subjectRepository.findBySlug("toan").orElseThrow();

        assertThat(secondsFromUtcNow("toan")).isLessThan(60);
        assertThat(reloaded.getCreatedAt()).isCloseTo(Instant.now(), within(1, ChronoUnit.MINUTES));
        assertThat(reloaded.getUpdatedAt()).isCloseTo(Instant.now(), within(1, ChronoUnit.MINUTES));
    }

    @Test
    void databaseDefaultTimestamp_isAlsoUtc() {
        entityManager.getEntityManager()
                .createNativeQuery("INSERT INTO subjects (slug, name) VALUES ('vat-ly', 'Vật lý')")
                .executeUpdate();

        assertThat(secondsFromUtcNow("vat-ly")).isLessThan(60);
    }

    private long secondsFromUtcNow(String slug) {
        Number seconds = (Number) entityManager.getEntityManager()
                .createNativeQuery(SECONDS_FROM_UTC_NOW)
                .setParameter("slug", slug)
                .getSingleResult();
        return seconds.longValue();
    }
}
