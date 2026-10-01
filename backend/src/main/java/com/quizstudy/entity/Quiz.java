package com.quizstudy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Một đề: lấy câu từ đâu (một bài hoặc cả môn), bao nhiêu câu, chế độ nào, bao lâu.
 * Câu cụ thể được rút ngẫu nhiên ở mỗi lượt làm, không gắn cố định với đề.
 */
@Entity
@Table(name = "quizzes")
public class Quiz extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    /** NULL: lấy câu từ cả môn. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;

    private String title;

    @Enumerated(EnumType.STRING)
    private QuizMode mode;

    private int questionCount;

    /** NULL: không giới hạn thời gian. */
    private Integer timeLimitMinutes;

    private boolean shuffleQuestions = true;

    @Column(name = "is_published")
    private boolean published;

    /** Dành cho JPA. */
    protected Quiz() {
    }

    public Quiz(Subject subject, Chapter chapter, String title, QuizMode mode, int questionCount) {
        this.subject = subject;
        this.chapter = chapter;
        this.title = title;
        this.mode = mode;
        this.questionCount = questionCount;
    }

    public Subject getSubject() {
        return subject;
    }

    public Chapter getChapter() {
        return chapter;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public QuizMode getMode() {
        return mode;
    }

    public int getQuestionCount() {
        return questionCount;
    }

    public void setQuestionCount(int questionCount) {
        this.questionCount = questionCount;
    }

    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }

    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public boolean isShuffleQuestions() {
        return shuffleQuestions;
    }

    public void setShuffleQuestions(boolean shuffleQuestions) {
        this.shuffleQuestions = shuffleQuestions;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }
}
