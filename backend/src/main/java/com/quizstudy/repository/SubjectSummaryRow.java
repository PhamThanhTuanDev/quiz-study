package com.quizstudy.repository;

/** Một dòng kết quả của truy vấn danh sách môn, kèm số bài và số câu (đếm ngay trong database). */
public record SubjectSummaryRow(
        String slug, String name, String code, String description, Long chapterCount, Long questionCount) {
}
