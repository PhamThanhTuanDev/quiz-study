package com.quizstudy.dto;

import java.util.List;

import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.QuestionType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Nội dung file JSON dùng để import một môn (định dạng: docs/database-design.md, mục 7).
 * File được sinh bởi script trong scripts/ (ví dụ extract_gdqp.py) và chủ dự án duyệt trước khi import.
 * Giới hạn độ dài khớp với cột trong V1__create_content_tables.sql.
 */
public record SubjectImportFile(
        @NotNull(message = "thiếu formatVersion")
        @Min(value = 1, message = "chỉ hỗ trợ formatVersion = 1")
        @Max(value = 1, message = "chỉ hỗ trợ formatVersion = 1")
        Integer formatVersion,

        @NotNull(message = "thiếu thông tin môn") @Valid SubjectData subject,

        @NotEmpty(message = "cần ít nhất một bài") List<@NotNull @Valid ChapterData> chapters) {

    public record SubjectData(
            @NotBlank(message = "không được để trống")
            @Size(max = 100, message = "tối đa 100 ký tự")
            @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*", message = "chỉ gồm chữ thường, số và dấu gạch ngang")
            String slug,

            @NotBlank(message = "không được để trống") @Size(max = 200, message = "tối đa 200 ký tự") String name,
            @Size(max = 50, message = "tối đa 50 ký tự") String code,
            String description,
            @NotNull(message = "không được để trống") Integer displayOrder,
            @NotNull(message = "không được để trống") Boolean published) {
    }

    public record ChapterData(
            @Size(max = 50, message = "tối đa 50 ký tự") String code,
            @NotBlank(message = "không được để trống") @Size(max = 255, message = "tối đa 255 ký tự") String title,
            @NotNull(message = "không được để trống") Integer displayOrder,
            @NotNull(message = "không được để trống") List<@NotNull @Valid QuestionData> questions) {
    }

    public record QuestionData(
            @NotNull(message = "không được để trống") QuestionType type,
            @NotBlank(message = "không được để trống") String content,
            String codeSnippet,
            String explanation,
            // Bắt buộc ghi rõ: nếu thiếu mà mặc định false thì câu bình thường sẽ không được xáo trộn.
            @NotNull(message = "không được để trống") Boolean shuffleAnswers,
            @NotNull(message = "không được để trống") QuestionStatus status,
            @Size(max = 500, message = "tối đa 500 ký tự") String reviewNote,
            @Valid SourceData source,
            @NotNull(message = "không được để trống") List<@NotNull @Valid AnswerData> answers) {
    }

    public record SourceData(
            @Size(max = 255, message = "tối đa 255 ký tự") String file,
            Integer page,
            @Size(max = 100, message = "tối đa 100 ký tự") String label) {
    }

    public record AnswerData(
            @NotBlank(message = "không được để trống") String content,
            // Bắt buộc ghi rõ: nếu thiếu (hoặc gõ sai tên trường) mà mặc định false thì đáp án đúng sẽ mất âm thầm.
            @NotNull(message = "không được để trống") Boolean correct) {
    }
}
