package com.quizstudy.mapper;

import java.util.List;

import com.quizstudy.dto.ChapterSummaryResponse;
import com.quizstudy.dto.SubjectDetailResponse;
import com.quizstudy.dto.SubjectSummaryResponse;
import com.quizstudy.entity.Subject;
import com.quizstudy.repository.ChapterSummaryRow;
import com.quizstudy.repository.SubjectSummaryRow;

/** Chuyển dữ liệu môn học từ tầng repository sang DTO trả về API. */
public final class SubjectMapper {

    private SubjectMapper() {
    }

    public static SubjectSummaryResponse toSummary(SubjectSummaryRow row) {
        return new SubjectSummaryResponse(row.slug(), row.name(), row.code(), row.description(),
                row.chapterCount(), row.questionCount());
    }

    public static SubjectDetailResponse toDetail(Subject subject, List<ChapterSummaryRow> chapterRows) {
        List<ChapterSummaryResponse> chapters = chapterRows.stream().map(SubjectMapper::toChapter).toList();
        long questionCount = chapters.stream().mapToLong(ChapterSummaryResponse::questionCount).sum();
        return new SubjectDetailResponse(subject.getSlug(), subject.getName(), subject.getCode(),
                subject.getDescription(), questionCount, chapters);
    }

    private static ChapterSummaryResponse toChapter(ChapterSummaryRow row) {
        return new ChapterSummaryResponse(row.id(), row.code(), row.title(), row.displayOrder(), row.questionCount());
    }
}
