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

    /** Ghi đè thông tin bài có sẵn (thứ tự giữ nguyên vì là khoá để khớp). */
    public static void applyTo(Chapter chapter, ChapterData data) {
        chapter.setCode(data.code());
        chapter.setTitle(data.title());
    }

    /** Phương án giữ đúng thứ tự trong file (1 = A, 2 = B…). */
    public static Question toQuestion(Chapter chapter, QuestionData data) {
        Question question = new Question(chapter, data.type(), data.content(), data.status());
        applyTo(question, data);
        addAnswers(question, data);
        return question;
    }

    /** Ghi đè nội dung câu có sẵn bằng dữ liệu trong file. Phương án do SubjectContentUpdater xử lý riêng. */
    public static void applyTo(Question question, QuestionData data) {
        question.setContent(data.content());
        question.setCodeSnippet(data.codeSnippet());
        question.setExplanation(data.explanation());
        question.setShuffleAnswers(data.shuffleAnswers());
        question.setStatus(data.status());
        question.setReviewNote(data.reviewNote());
        question.setSourceFile(data.source().file());
        question.setSourcePage(data.source().page());
        question.setSourceLabel(data.source().label());
    }

    public static void addAnswers(Question question, QuestionData data) {
        for (AnswerData answer : data.answers()) {
            question.addAnswer(answer.content(), answer.correct());
        }
    }
}
