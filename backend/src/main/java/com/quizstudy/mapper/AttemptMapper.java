package com.quizstudy.mapper;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.quizstudy.dto.AttemptResponse;
import com.quizstudy.dto.AttemptResponse.AnswerOptionResponse;
import com.quizstudy.dto.AttemptResponse.AttemptQuestionResponse;
import com.quizstudy.dto.AttemptResponse.ExamResultResponse;
import com.quizstudy.dto.AnswerFeedbackResponse;
import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.QuizResult;
import com.quizstudy.entity.UserAnswer;
import com.quizstudy.service.AnswerShuffler;

/**
 * Chuyển một lượt làm bài sang DTO. Quy tắc quan trọng nhất (D-037, D-038, .claude/rules/backend.md):
 * chỉ đưa đáp án đúng ra ngoài khi được phép: luyện tập với câu đã trả lời, thi thử khi bài đã kết thúc.
 */
public final class AttemptMapper {

    private AttemptMapper() {
    }

    /**
     * @param answers   các câu của lượt làm theo thứ tự
     * @param questions câu hỏi theo id, đã nạp phương án
     * @param now       giờ server, để tính thời gian còn lại
     */
    public static AttemptResponse toResponse(QuizResult attempt, List<UserAnswer> answers,
            Map<Long, Question> questions, Instant now) {
        Quiz quiz = attempt.getQuiz();
        List<AttemptQuestionResponse> items = answers.stream()
                .map(answer -> toQuestion(attempt, answer, questions.get(answer.getQuestion().getId())))
                .toList();
        return new AttemptResponse(attempt.getPublicId(), quiz.getId(), quiz.getTitle(), quiz.getMode(),
                quiz.getSubject().getSlug(), quiz.getSubject().getName(), attempt.getStatus(), attempt.getStartedAt(),
                attempt.getExpiresAt(), remainingSeconds(attempt, now), items, toResult(attempt, answers));
    }

    /**
     * Đúng/sai và id phương án đúng của một câu (bỏ trống là sai). Cả hai tính theo đáp án hiện tại (không dùng
     * kết quả chấm đã lưu), để luôn khớp nhau kể cả khi đáp án được sửa qua import sau đó; điểm của bài thi
     * thì giữ như lúc chấm.
     */
    public static AnswerFeedbackResponse toFeedback(UserAnswer answer, Question question) {
        Long correctAnswerId = question.getAnswers().stream()
                .filter(Answer::isCorrect)
                .map(Answer::getId)
                .findFirst()
                .orElse(null);
        boolean correct = answer.isAnswered() && answer.getSelectedAnswer().getId().equals(correctAnswerId);
        return new AnswerFeedbackResponse(correct, correctAnswerId, question.getExplanation());
    }

    private static AttemptQuestionResponse toQuestion(QuizResult attempt, UserAnswer answer, Question question) {
        List<AnswerOptionResponse> options = AnswerShuffler.order(attempt.getPublicId(), question).stream()
                .map(option -> new AnswerOptionResponse(option.getId(), option.getContent(), option.getBlanks()))
                .toList();
        Long selectedAnswerId = answer.isAnswered() ? answer.getSelectedAnswer().getId() : null;
        return new AttemptQuestionResponse(question.getId(), answer.getQuestionOrder(), question.getContent(),
                question.getCodeSnippet(), options, selectedAnswerId,
                mayRevealAnswer(attempt, answer) ? toFeedback(answer, question) : null);
    }

    /** Luyện tập: câu đã trả lời (đã khoá). Thi thử: bài đã nộp hoặc hết giờ (xem lại mọi câu). */
    private static boolean mayRevealAnswer(QuizResult attempt, UserAnswer answer) {
        return attempt.getQuiz().getMode() == QuizMode.PRACTICE ? answer.isAnswered() : !attempt.isInProgress();
    }

    private static Long remainingSeconds(QuizResult attempt, Instant now) {
        if (attempt.getExpiresAt() == null || !attempt.isInProgress()) {
            return null;
        }
        return Math.max(0, Duration.between(now, attempt.getExpiresAt()).toSeconds());
    }

    private static ExamResultResponse toResult(QuizResult attempt, List<UserAnswer> answers) {
        if (attempt.getScore() == null) {
            return null;
        }
        int unanswered = (int) answers.stream().filter(answer -> !answer.isAnswered()).count();
        return new ExamResultResponse(attempt.getCorrectCount(), unanswered, attempt.getTotalQuestions(),
                attempt.getScore(), attempt.getSubmittedAt());
    }
}
