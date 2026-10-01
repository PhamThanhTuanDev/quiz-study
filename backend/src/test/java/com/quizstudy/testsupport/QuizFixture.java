package com.quizstudy.testsupport;

import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Chapter;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.QuestionType;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.Subject;

import jakarta.persistence.EntityManager;

/** Tạo nhanh dữ liệu làm bài cho test tích hợp (chạy trong transaction của test, tự rollback). */
public class QuizFixture {

    private final EntityManager entityManager;

    public QuizFixture(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Subject subject(String slug, boolean published) {
        Subject subject = new Subject(slug, "Môn " + slug);
        subject.setPublished(published);
        entityManager.persist(subject);
        return subject;
    }

    public Chapter chapter(Subject subject, String title, int order) {
        Chapter chapter = new Chapter(subject, title, order);
        entityManager.persist(chapter);
        return chapter;
    }

    /** Câu có 4 phương án "A".."D", phương án thứ {@code correctIndex} (0 = A) là đáp án đúng. */
    public Question question(Chapter chapter, String content, QuestionStatus status, int correctIndex) {
        Question question = new Question(chapter, QuestionType.SINGLE_CHOICE, content, status);
        String[] labels = { "A", "B", "C", "D" };
        for (int i = 0; i < labels.length; i++) {
            question.addAnswer(labels[i], i == correctIndex);
        }
        entityManager.persist(question);
        return question;
    }

    public Quiz quiz(Subject subject, Chapter chapter, QuizMode mode, int questionCount, Integer timeLimitMinutes) {
        Quiz quiz = new Quiz(subject, chapter, mode + " " + subject.getSlug(), mode, questionCount);
        quiz.setTimeLimitMinutes(timeLimitMinutes);
        quiz.setPublished(true);
        entityManager.persist(quiz);
        return quiz;
    }

    public static Answer correctAnswer(Question question) {
        return question.getAnswers().stream().filter(Answer::isCorrect).findFirst().orElseThrow();
    }

    public static Answer wrongAnswer(Question question) {
        return question.getAnswers().stream().filter(answer -> !answer.isCorrect()).findFirst().orElseThrow();
    }
}
