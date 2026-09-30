-- =====================================================================
-- V1: bảng nội dung học tập, dùng chung cho mọi môn.
--     subjects → chapters → questions → answers
-- Thiết kế: docs/database-design.md, mục 4.2 → 4.5.
--
-- Thời gian lưu theo UTC (D-027). Giá trị mặc định CURRENT_TIMESTAMP(6) chỉ để dự phòng
-- khi thêm dữ liệu bằng SQL tay; bình thường Hibernate tự điền created_at/updated_at.
-- Không sửa file này sau khi đã chạy: thay đổi schema thì tạo migration mới (V2, V3…).
-- =====================================================================

CREATE TABLE subjects (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    slug          VARCHAR(100) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    code          VARCHAR(50)  NULL,
    description   TEXT         NULL,
    display_order INT          NOT NULL DEFAULT 0,
    is_published  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_subjects PRIMARY KEY (id),
    CONSTRAINT uk_subjects_slug UNIQUE (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE chapters (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    subject_id    BIGINT       NOT NULL,
    code          VARCHAR(50)  NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT         NULL,
    display_order INT          NOT NULL,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_chapters PRIMARY KEY (id),
    CONSTRAINT fk_chapters_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
    -- Lấy các chương của một môn theo thứ tự; cũng là index cho khoá ngoại subject_id.
    INDEX idx_chapters_subject_order (subject_id, display_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE questions (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    chapter_id      BIGINT       NOT NULL,
    question_type   VARCHAR(30)  NOT NULL,
    content         TEXT         NOT NULL,
    code_snippet    TEXT         NULL,
    explanation     TEXT         NULL,
    shuffle_answers BOOLEAN      NOT NULL DEFAULT TRUE,
    status          VARCHAR(20)  NOT NULL,
    review_note     VARCHAR(500) NULL,
    source_file     VARCHAR(255) NULL,
    source_page     INT          NULL,
    source_label    VARCHAR(100) NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_questions PRIMARY KEY (id),
    CONSTRAINT fk_questions_chapter FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE RESTRICT,
    -- Lấy câu của một chương theo trạng thái (ví dụ chỉ PUBLISHED khi tạo bài thi).
    INDEX idx_questions_chapter_status (chapter_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE answers (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    question_id   BIGINT      NOT NULL,
    -- Thứ tự gốc (1 = A, 2 = B…). Nhãn A/B/C tính khi hiển thị, không lưu.
    display_order INT         NOT NULL,
    content       TEXT        NOT NULL,
    is_correct    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_answers PRIMARY KEY (id),
    -- Phương án là một phần của câu hỏi: xoá câu hỏi thì xoá luôn phương án.
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
    CONSTRAINT uk_answers_question_order UNIQUE (question_id, display_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
