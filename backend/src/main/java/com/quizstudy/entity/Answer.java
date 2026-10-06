package com.quizstudy.entity;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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

    /** Câu điền khuyết: giá trị từng chỗ trống theo thứ tự (D-048); NULL với phương án thường. */
    @Convert(converter = StringListJsonConverter.class)
    private List<String> blanks;

    @Column(name = "is_correct")
    private boolean correct;

    /** Dành cho JPA. */
    protected Answer() {
    }

    Answer(Question question, int displayOrder, String content, boolean correct, List<String> blanks) {
        this.question = question;
        this.displayOrder = displayOrder;
        this.content = content;
        this.correct = correct;
        this.blanks = copyOf(blanks);
    }

    /**
     * Sửa nội dung, đúng/sai và các chỗ trống tại chỗ (import lại): giữ nguyên id, nên lựa chọn đã lưu trong các
     * lượt làm cũ (user_answers.selected_answer_id) vẫn trỏ đúng phương án.
     */
    public void update(String newContent, boolean newCorrect, List<String> newBlanks) {
        this.content = newContent;
        this.correct = newCorrect;
        this.blanks = copyOf(newBlanks);
    }

    private static List<String> copyOf(List<String> values) {
        return values == null ? null : List.copyOf(values);
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

    /** Danh sách chỉ đọc, hoặc NULL nếu không phải phương án của câu điền khuyết. */
    public List<String> getBlanks() {
        return blanks;
    }

    public boolean isCorrect() {
        return correct;
    }
}
