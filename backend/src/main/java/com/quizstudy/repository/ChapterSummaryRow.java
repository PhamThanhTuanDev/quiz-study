package com.quizstudy.repository;

/** Một dòng kết quả của truy vấn danh sách bài của một môn, kèm số câu (đếm ngay trong database). */
public record ChapterSummaryRow(Long id, String code, String title, Integer displayOrder, Long questionCount) {
}
