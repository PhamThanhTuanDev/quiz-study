package com.quizstudy.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/**
 * Một lượt làm bài (API gọi là "attempt"). Bộ câu và thứ tự câu được chụp vào {@link UserAnswer}
 * ngay lúc bắt đầu, nên tải lại trang vẫn đúng các câu cũ.
 * Cột {@code user_id} chưa ánh xạ: khách làm bài (D-037); gắn người dùng ở Phase 7.
 */
@Entity
@Table(name = "quiz_results")
public class QuizResult extends BaseEntity {

    /** Mã ngẫu nhiên (UUID) dùng trên URL thay cho id tăng dần. */
    private String publicId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @Enumerated(EnumType.STRING)
    private QuizResultStatus status;

    private int totalQuestions;

    private Integer correctCount;

    /** Thang 10, chỉ có ở thi thử (D-037). */
    private BigDecimal score;

    private Instant startedAt;

    /** Hạn nộp, chụp lúc bắt đầu. NULL: không giới hạn thời gian. */
    private Instant expiresAt;

    private Instant submittedAt;

    @OneToMany(mappedBy = "quizResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder")
    private List<UserAnswer> answers = new ArrayList<>();

    /** Dành cho JPA. */
    protected QuizResult() {
    }

    public QuizResult(Quiz quiz, String publicId, Instant startedAt, Instant expiresAt) {
        this.quiz = quiz;
        this.publicId = publicId;
        this.startedAt = startedAt;
        this.expiresAt = expiresAt;
        this.status = QuizResultStatus.IN_PROGRESS;
    }

    /** Thêm một câu vào cuối lượt làm; thứ tự (1, 2, 3…) tính tự động theo thứ tự thêm. */
    public UserAnswer addQuestion(Question question) {
        UserAnswer answer = new UserAnswer(this, question, answers.size() + 1);
        answers.add(answer);
        totalQuestions = answers.size();
        return answer;
    }

    /** Ghi kết quả chấm của thi thử (nộp bài hoặc hết giờ). */
    public void finish(QuizResultStatus finalStatus, int correct, BigDecimal finalScore, Instant finishedAt) {
        this.status = finalStatus;
        this.correctCount = correct;
        this.score = finalScore;
        this.submittedAt = finishedAt;
    }

    public boolean isInProgress() {
        return status == QuizResultStatus.IN_PROGRESS;
    }

    /** Đã tới hạn nộp chưa (đề không giới hạn thời gian thì không bao giờ hết hạn). */
    public boolean isPastDeadline(Instant now) {
        return expiresAt != null && !now.isBefore(expiresAt);
    }

    /** Danh sách chỉ đọc, theo thứ tự câu; thêm câu qua {@link #addQuestion(Question)}. */
    public List<UserAnswer> getAnswers() {
        return Collections.unmodifiableList(answers);
    }

    public String getPublicId() {
        return publicId;
    }

    public Quiz getQuiz() {
        return quiz;
    }

    public QuizResultStatus getStatus() {
        return status;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public Integer getCorrectCount() {
        return correctCount;
    }

    public BigDecimal getScore() {
        return score;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }
}
