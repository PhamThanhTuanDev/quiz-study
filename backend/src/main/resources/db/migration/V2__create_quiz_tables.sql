-- =====================================================================
-- V2: bảng làm bài, dùng chung cho mọi môn.
--     quizzes → quiz_results (một lượt làm) → user_answers (một câu trong lượt)
-- Thiết kế: docs/database-design.md, mục 4.6 → 4.8. Hành vi: D-037.
--
-- Thời gian lưu theo UTC (D-027). Không sửa file này sau khi đã chạy: tạo migration mới.
-- Khoá ngoại tới users (quizzes.created_by, quiz_results.user_id) thêm ở Phase 7, khi có bảng users.
-- =====================================================================

CREATE TABLE quizzes (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    subject_id         BIGINT       NOT NULL,
    -- NULL: lấy câu từ cả môn.
    chapter_id         BIGINT       NULL,
    -- NULL: đề do hệ thống tạo khi import (đề mặc định).
    created_by         BIGINT       NULL,
    title              VARCHAR(255) NOT NULL,
    mode               VARCHAR(20)  NOT NULL,
    -- Số câu rút ngẫu nhiên mỗi lượt; phạm vi có ít câu hơn thì lấy hết.
    question_count     INT          NOT NULL,
    -- NULL: không giới hạn thời gian.
    time_limit_minutes INT          NULL,
    shuffle_questions  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_published       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_quizzes PRIMARY KEY (id),
    CONSTRAINT fk_quizzes_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
    CONSTRAINT fk_quizzes_chapter FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE RESTRICT,
    CONSTRAINT ck_quizzes_question_count CHECK (question_count > 0),
    CONSTRAINT ck_quizzes_time_limit CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    -- Danh sách đề của một môn; cũng là index cho khoá ngoại subject_id.
    INDEX idx_quizzes_subject (subject_id, is_published),
    INDEX idx_quizzes_chapter (chapter_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE quiz_results (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    -- Mã ngẫu nhiên (UUID) dùng trên URL: khách không có tài khoản, nên không để lộ id tăng dần
    -- (đổi số trên URL là xem được bài của người khác).
    public_id       CHAR(36)     NOT NULL,
    quiz_id         BIGINT       NOT NULL,
    -- NULL: khách (D-037).
    user_id         BIGINT       NULL,
    status          VARCHAR(20)  NOT NULL,
    total_questions INT          NOT NULL,
    -- Có giá trị khi thi thử đã nộp hoặc hết giờ; luyện tập không chấm điểm (D-037).
    correct_count   INT          NULL,
    score           DECIMAL(5,2) NULL,
    started_at      DATETIME(6)  NOT NULL,
    -- Hạn nộp, chụp lúc bắt đầu (đổi thời gian của đề sau đó không ảnh hưởng lượt đang làm). NULL: không giới hạn.
    expires_at      DATETIME(6)  NULL,
    submitted_at    DATETIME(6)  NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_quiz_results PRIMARY KEY (id),
    CONSTRAINT uk_quiz_results_public_id UNIQUE (public_id),
    CONSTRAINT fk_quiz_results_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE RESTRICT,
    -- Lịch sử làm bài của một người (Phase 6–7).
    INDEX idx_quiz_results_user_started (user_id, started_at),
    -- Xếp hạng theo đề (Phase 9); cũng là index cho khoá ngoại quiz_id.
    INDEX idx_quiz_results_quiz_score (quiz_id, score)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_answers (
    id                 BIGINT      NOT NULL AUTO_INCREMENT,
    quiz_result_id     BIGINT      NOT NULL,
    question_id        BIGINT      NOT NULL,
    -- NULL: chưa chọn / bỏ trống.
    selected_answer_id BIGINT      NULL,
    -- Thứ tự câu trong lượt làm (1, 2, 3…), chụp lúc bắt đầu.
    question_order     INT         NOT NULL,
    -- Luyện tập: ghi ngay khi trả lời. Thi thử: ghi khi nộp bài.
    is_correct         BOOLEAN     NULL,
    answered_at        DATETIME(6) NULL,
    created_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_user_answers PRIMARY KEY (id),
    -- Các câu là một phần của lượt làm: xoá lượt làm thì xoá luôn các câu.
    CONSTRAINT fk_user_answers_quiz_result FOREIGN KEY (quiz_result_id) REFERENCES quiz_results (id) ON DELETE CASCADE,
    -- Câu hỏi và phương án đã có người làm thì không xoá được (import chuyển câu đó sang ARCHIVED).
    CONSTRAINT fk_user_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_answers_answer FOREIGN KEY (selected_answer_id) REFERENCES answers (id) ON DELETE RESTRICT,
    CONSTRAINT uk_user_answers_result_question UNIQUE (quiz_result_id, question_id),
    CONSTRAINT uk_user_answers_result_order UNIQUE (quiz_result_id, question_order),
    INDEX idx_user_answers_question (question_id),
    INDEX idx_user_answers_answer (selected_answer_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
