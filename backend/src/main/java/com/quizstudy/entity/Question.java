package com.quizstudy.entity;

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
 * Câu hỏi thuộc một chương. Nội dung giữ nguyên chữ của tài liệu nguồn; nguồn gốc lưu trong
 * sourceFile / sourcePage / sourceLabel để đối chiếu.
 */
@Entity
@Table(name = "questions")
public class Question extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chapter_id")
    private Chapter chapter;

    @Enumerated(EnumType.STRING)
    private QuestionType questionType;

    private String content;

    /** Đoạn code kèm đề; giữ nguyên thụt lề. */
    private String codeSnippet;

    private String explanation;

    /** FALSE cho câu có phương án phụ thuộc vị trí, ví dụ "Tất cả đều đúng". */
    private boolean shuffleAnswers = true;

    @Enumerated(EnumType.STRING)
    private QuestionStatus status;

    /** Lý do cần duyệt, ví dụ "Tài liệu không có đáp án". */
    private String reviewNote;

    private String sourceFile;

    private Integer sourcePage;

    /** Số câu gốc trong tài liệu, ví dụ "Bài 10 – Câu 19 (lần 2)". */
    private String sourceLabel;

    // Phương án là một phần của câu hỏi: lưu/xoá câu hỏi thì lưu/xoá theo phương án.
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder")
    private List<Answer> answers = new ArrayList<>();

    /** Dành cho JPA. */
    protected Question() {
    }

    public Question(Chapter chapter, QuestionType questionType, String content, QuestionStatus status) {
        this.chapter = chapter;
        this.questionType = questionType;
        this.content = content;
        this.status = status;
    }

    /**
     * Thêm phương án vào cuối danh sách. Thứ tự (1 = A, 2 = B…) được tính tự động
     * để luôn khớp với thứ tự thêm vào.
     */
    public Answer addAnswer(String content, boolean correct) {
        Answer answer = new Answer(this, answers.size() + 1, content, correct);
        answers.add(answer);
        return answer;
    }

    /** Danh sách chỉ đọc; thêm phương án qua {@link #addAnswer(String, boolean)}. */
    public List<Answer> getAnswers() {
        return Collections.unmodifiableList(answers);
    }

    public Chapter getChapter() {
        return chapter;
    }

    public QuestionType getQuestionType() {
        return questionType;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCodeSnippet() {
        return codeSnippet;
    }

    public void setCodeSnippet(String codeSnippet) {
        this.codeSnippet = codeSnippet;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public boolean isShuffleAnswers() {
        return shuffleAnswers;
    }

    public void setShuffleAnswers(boolean shuffleAnswers) {
        this.shuffleAnswers = shuffleAnswers;
    }

    public QuestionStatus getStatus() {
        return status;
    }

    public void setStatus(QuestionStatus status) {
        this.status = status;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public String getSourceFile() {
        return sourceFile;
    }

    public void setSourceFile(String sourceFile) {
        this.sourceFile = sourceFile;
    }

    public Integer getSourcePage() {
        return sourcePage;
    }

    public void setSourcePage(Integer sourcePage) {
        this.sourcePage = sourcePage;
    }

    public String getSourceLabel() {
        return sourceLabel;
    }

    public void setSourceLabel(String sourceLabel) {
        this.sourceLabel = sourceLabel;
    }
}
