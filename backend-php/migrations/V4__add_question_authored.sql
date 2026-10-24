-- =====================================================================
-- Chạy MỘT LẦN trên database của hosting (phpMyAdmin → chọn database → tab SQL → dán → Go), trước khi tải lên bản
-- PHP có nhãn "Câu tự soạn". Bản PHP không có Flyway nên thay đổi schema phải chạy tay (D-054).
--
-- Nội dung giống backend/src/main/resources/db/migration/V4__add_question_authored.sql (D-053), viết cho MariaDB và
-- chạy lại nhiều lần vẫn an toàn. Thêm một dòng vào flyway_schema_history (checksum đúng như Flyway tính) để nếu sau
-- này chạy lại bản Java trên database này, Flyway coi như V4 đã chạy và không báo lỗi.
-- =====================================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_authored BOOLEAN NOT NULL DEFAULT FALSE AFTER review_note;

-- Câu đã import trước V4: câu trích từ tài liệu đều có số trang, chỉ câu tự soạn (D-049) không có trang.
-- Chỉ chạy khi V4 chưa được ghi nhận, để chạy lại không ghi đè nhãn đã đặt bằng import sau này.
UPDATE questions SET is_authored = TRUE
 WHERE source_page IS NULL
   AND NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '4');

INSERT INTO flyway_schema_history
    (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT MAX(installed_rank) + 1, '4', 'add question authored', 'SQL', 'V4__add_question_authored.sql', 2078821902,
       SUBSTRING_INDEX(USER(), '@', 1), NOW(), 0, 1
  FROM flyway_schema_history
HAVING SUM(version = '4') = 0;
