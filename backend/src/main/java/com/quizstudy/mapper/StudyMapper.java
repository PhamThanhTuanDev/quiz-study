package com.quizstudy.mapper;

import java.util.List;
import java.util.stream.IntStream;

import com.quizstudy.dto.StudyChapterResponse;
import com.quizstudy.dto.StudyChapterResponse.StudyAnswerResponse;
import com.quizstudy.dto.StudyChapterResponse.StudyQuestionResponse;
import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;

/** Chuyển một bài và các câu của bài sang DTO của chế độ "Học". */
public final class StudyMapper {

    private StudyMapper() {
    }

    public static StudyChapterResponse toStudyChapter(Chapter chapter, List<Question> questions) {
        List<StudyQuestionResponse> items = IntStream.range(0, questions.size())
                .mapToObj(index -> toQuestion(questions.get(index), index + 1))
                .toList();
        return new StudyChapterResponse(chapter.getSubject().getSlug(), chapter.getSubject().getName(),
                chapter.getId(), chapter.getCode(), chapter.getTitle(), items);
    }

    private static StudyQuestionResponse toQuestion(Question question, int order) {
        List<StudyAnswerResponse> answers = question.getAnswers().stream().map(StudyMapper::toAnswer).toList();
        return new StudyQuestionResponse(question.getId(), order, question.getContent(), question.getCodeSnippet(),
                answers, question.getExplanation());
    }

    private static StudyAnswerResponse toAnswer(Answer answer) {
        return new StudyAnswerResponse(answer.getId(), answer.getContent(), answer.isCorrect());
    }
}
