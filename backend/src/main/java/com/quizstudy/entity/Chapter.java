package com.quizstudy.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Chương (hoặc bài) của một môn. Môn không chia chương thì có một chương mặc định. */
@Entity
@Table(name = "chapters")
public class Chapter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    /** Mã ngắn theo tài liệu nguồn, ví dụ {@code BAI-01}, {@code C02}. */
    private String code;

    private String title;

    private String description;

    private int displayOrder;

    /** Dành cho JPA. */
    protected Chapter() {
    }

    public Chapter(Subject subject, String title, int displayOrder) {
        this.subject = subject;
        this.title = title;
        this.displayOrder = displayOrder;
    }

    public Subject getSubject() {
        return subject;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
