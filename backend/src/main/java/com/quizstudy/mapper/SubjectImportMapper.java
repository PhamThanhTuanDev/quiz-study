package com.quizstudy.mapper;

import com.quizstudy.dto.SubjectImportFile.AnswerData;
import com.quizstudy.dto.SubjectImportFile.ChapterData;
import com.quizstudy.dto.SubjectImportFile.QuestionData;
import com.quizstudy.dto.SubjectImportFile.SubjectData;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.Subject;

/** Chuyển dữ liệu trong file import thành entity. Không kiểm tra hợp lệ: việc đó ở SubjectImportService. */
public final class SubjectImportMapper {

    private SubjectImportMapper() {
    }

    public static Subject toNewSubject(SubjectData data) {
        return applyTo(new Subject(data.slug(), data.name()), data);
    }

    /** Ghi đè thông tin môn có sẵn bằng dữ liệu trong file (slug giữ nguyên). */
    public static Subject applyTo(Subject subject, SubjectData data) {
        subject.setName(data.name());
        subject.setCode(data.code());
        subject.setDescription(data.description());
        subject.setDisplayOrder(data.displayOrder());
        subject.setPublished(data.published());
        return subject;
    }

    public static Chapter toChapter(Subject subject, ChapterData data) {
        Chapter chapter = new Chapter(subject, data.title(), data.displayOrder());
        chapter.setCode(data.code());
        return chapter;
    }

    /** Phương án giữ đúng thứ tự trong file (1 = A, 2 = B…). */
    public static Question toQuestion(Chapter chapter, QuestionData data) {
        Question question = new Question(chapter, data.type(), data.content(), data.status());
        question.setCodeSnippet(data.codeSnippet());
        question.setExplanation(data.explanation());
        question.setShuffleAnswers(data.shuffleAnswers());
        question.setReviewNote(data.reviewNote());
        if (data.source() != null) {
            question.setSourceFile(data.source().file());
            question.setSourcePage(data.source().page());
            question.setSourceLabel(data.source().label());
        }
        for (AnswerData answer : data.answers()) {
            question.addAnswer(answer.content(), answer.correct());
        }
        return question;
    }
}
