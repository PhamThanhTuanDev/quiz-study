package com.quizstudy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Môn học. Mỗi môn là một dòng dữ liệu; thêm môn mới không cần sửa code. */
@Entity
@Table(name = "subjects")
public class Subject extends BaseEntity {

    /** Định danh dùng trên URL, ví dụ {@code python}, {@code gdqp}. */
    private String slug;

    private String name;

    /** Mã học phần, ví dụ {@code IPPA233277}. */
    private String code;

    private String description;

    private int displayOrder;

    @Column(name = "is_published")
    private boolean published;

    /** Dành cho JPA. */
    protected Subject() {
    }

    public Subject(String slug, String name) {
        this.slug = slug;
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
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

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }
}
