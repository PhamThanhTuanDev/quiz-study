package com.quizstudy.dto;

import java.util.List;

/**
 * Chế độ "Học" của một bài (D-044): mọi câu dùng được của bài, kèm đáp án đúng và giải thích, để đọc và ghi nhớ.
 * Không phải bài làm: không chấm điểm, không lưu gì. Phương án giữ đúng thứ tự trong tài liệu (không xáo).
 */
public record StudyChapterResponse(String subjectSlug, String subjectName, Long chapterId, String chapterCode,
        String chapterTitle, List<StudyQuestionResponse> questions) {

    /**
     * @param order       số thứ tự câu trong bài, từ 1
     * @param explanation giải thích / ghi chú đã sửa so với tài liệu, có thể NULL
     */
    public record StudyQuestionResponse(Long questionId, int order, String content, String codeSnippet,
            List<StudyAnswerResponse> answers, String explanation) {
    }

    public record StudyAnswerResponse(Long id, String content, boolean correct) {
    }
}
