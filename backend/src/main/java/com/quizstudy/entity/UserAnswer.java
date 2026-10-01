package com.quizstudy.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Một câu trong lượt làm bài: câu nào, đứng thứ mấy, người học chọn phương án nào, đúng hay sai.
 * Tạo qua {@link QuizResult#addQuestion(Question)}.
 */
@Entity
@Table(name = "user_answers")
public class UserAnswer extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_result_id")
    private QuizResult quizResult;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private Question question;

    /** NULL: chưa chọn / bỏ trống. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_answer_id")
    private Answer selectedAnswer;

    private int questionOrder;

    /** NULL: chưa chấm. Luyện tập chấm ngay khi trả lời; thi thử chấm khi nộp bài. */
    @Column(name = "is_correct")
    private Boolean correct;

    private Instant answeredAt;

    /** Dành cho JPA. */
    protected UserAnswer() {
    }

    UserAnswer(QuizResult quizResult, Question question, int questionOrder) {
        this.quizResult = quizResult;
        this.question = question;
        this.questionOrder = questionOrder;
    }

    /** Ghi lựa chọn; phương án phải thuộc đúng câu hỏi này (service kiểm tra trước khi gọi). */
    public void select(Answer answer, Instant at) {
        this.selectedAnswer = answer;
        this.answeredAt = at;
    }

    /** Chấm câu này: đúng khi đã chọn và phương án được chọn là đáp án đúng; bỏ trống là sai. */
    public void grade() {
        this.correct = selectedAnswer != null && selectedAnswer.isCorrect();
    }

    public boolean isAnswered() {
        return selectedAnswer != null;
    }

    public QuizResult getQuizResult() {
        return quizResult;
    }

    public Question getQuestion() {
        return question;
    }

    public Answer getSelectedAnswer() {
        return selectedAnswer;
    }

    public int getQuestionOrder() {
        return questionOrder;
    }

    public Boolean getCorrect() {
        return correct;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }
}
