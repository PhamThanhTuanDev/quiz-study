package com.quizstudy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Một phương án của câu hỏi. Tạo qua {@link Question#addAnswer(String, boolean)}.
 * {@code correct} không bao giờ được gửi cho người học trước khi nộp bài.
 */
@Entity
@Table(name = "answers")
public class Answer extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private Question question;

    /** Thứ tự gốc (1 = A, 2 = B…). Nhãn A/B/C được tính khi hiển thị. */
    private int displayOrder;

    private String content;

    @Column(name = "is_correct")
    private boolean correct;

    /** Dành cho JPA. */
    protected Answer() {
    }

    Answer(Question question, int displayOrder, String content, boolean correct) {
        this.question = question;
        this.displayOrder = displayOrder;
        this.content = content;
        this.correct = correct;
    }

    /**
     * Sửa nội dung và đúng/sai tại chỗ (import lại): giữ nguyên id, nên lựa chọn đã lưu trong các lượt làm
     * cũ (user_answers.selected_answer_id) vẫn trỏ đúng phương án.
     */
    public void update(String newContent, boolean newCorrect) {
        this.content = newContent;
        this.correct = newCorrect;
    }

    public Question getQuestion() {
        return question;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public String getContent() {
        return content;
    }

    public boolean isCorrect() {
        return correct;
    }
}
