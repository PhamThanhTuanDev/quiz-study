-- =====================================================================
-- V5 (D-055): đề thi thử chia phần như đề thật, và phương án dạng hình ảnh (biểu đồ Matplotlib).
--   questions.category : loại câu trong môn (ví dụ "ket-qua", "tim-loi"), do file import khai báo; NULL = chưa xếp loại
--   quiz_sections      : các phần của một đề (thứ tự, tên, loại câu, số câu rút); đề không có phần thì rút ngẫu nhiên
--   media              : ảnh (PNG/SVG) lưu trong database, khoá theo SHA-256 nội dung nên ảnh trùng chỉ lưu một lần
--   answers.media_id   : ảnh của phương án; content vẫn bắt buộc (mô tả ảnh cho trình đọc màn hình, dùng khi import lại)
-- Bảng mới không ghi COLLATE: dùng mặc định của database (MySQL 8 trên máy dev, MariaDB trên hosting).
-- =====================================================================

ALTER TABLE questions ADD COLUMN category VARCHAR(50) NULL AFTER question_type;
-- Rút câu cho từng phần của đề: lọc theo loại câu và trạng thái.
CREATE INDEX idx_questions_category_status ON questions (category, status);

CREATE TABLE quiz_sections (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    quiz_id        BIGINT       NOT NULL,
    position       INT          NOT NULL,
    title          VARCHAR(255) NOT NULL,
    category       VARCHAR(50)  NOT NULL,
    question_count INT          NOT NULL,
    created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_quiz_sections PRIMARY KEY (id),
    -- Các phần là một phần của đề: xoá đề thì xoá luôn các phần.
    CONSTRAINT fk_quiz_sections_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE,
    CONSTRAINT uk_quiz_sections_quiz_position UNIQUE (quiz_id, position),
    CONSTRAINT ck_quiz_sections_question_count CHECK (question_count > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE media (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    sha256       CHAR(64)    NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    data         MEDIUMBLOB  NOT NULL,
    created_at   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_media PRIMARY KEY (id),
    CONSTRAINT uk_media_sha256 UNIQUE (sha256)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

ALTER TABLE answers ADD COLUMN media_id BIGINT NULL AFTER blanks;
-- Tạo index trước để khoá ngoại dùng luôn index này (không tự sinh thêm index trùng).
CREATE INDEX idx_answers_media ON answers (media_id);
-- Ảnh đang được phương án dùng thì không xoá được; import tự dọn ảnh không còn ai dùng.
ALTER TABLE answers ADD CONSTRAINT fk_answers_media FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT;
