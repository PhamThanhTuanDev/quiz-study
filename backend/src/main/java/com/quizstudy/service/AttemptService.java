package com.quizstudy.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.quizstudy.dto.AttemptResponse;
import com.quizstudy.dto.SaveAnswerResponse;
import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Question;
import com.quizstudy.entity.QuestionStatus;
import com.quizstudy.entity.Quiz;
import com.quizstudy.entity.QuizMode;
import com.quizstudy.entity.QuizResult;
import com.quizstudy.entity.QuizResultStatus;
import com.quizstudy.entity.UserAnswer;
import com.quizstudy.exception.BusinessRuleException;
import com.quizstudy.exception.InvalidRequestException;
import com.quizstudy.exception.ResourceNotFoundException;
import com.quizstudy.mapper.AttemptMapper;
import com.quizstudy.repository.QuestionRepository;
import com.quizstudy.repository.QuizRepository;
import com.quizstudy.repository.QuizResultRepository;
import com.quizstudy.repository.UserAnswerRepository;

/**
 * Lượt làm bài: bắt đầu, mở lại, lưu lựa chọn, nộp bài. Chấm điểm ở server (D-037):
 * <ul>
 * <li>Luyện tập: chấm từng câu ngay khi trả lời, câu đã trả lời thì khoá; không nộp bài, không có điểm.</li>
 * <li>Thi thử: lưu và đổi lựa chọn tới khi nộp; nộp (hoặc hết giờ) thì chấm cả bài, thang 10.</li>
 * </ul>
 * Thi thử quá hạn được chấm "lười": yêu cầu đầu tiên tới sau hạn (mở lại, lưu, nộp) sẽ chấm với các câu đã lưu
 * và chuyển sang EXPIRED. Mọi thao tác ghi khoá dòng của lượt làm, nên hai yêu cầu cùng lúc không chen nhau.
 * Lượt đã bắt đầu vẫn làm tiếp được kể cả khi môn/đề bị ẩn sau đó; chỉ việc bắt đầu lượt mới kiểm tra publish.
 */
@Service
@Transactional
public class AttemptService {

    /** Cho phép trễ một chút sau hạn nộp (độ trễ mạng khi bấm lưu/nộp đúng lúc đồng hồ về 0). */
    static final Duration DEADLINE_GRACE = Duration.ofSeconds(10);

    private final QuizRepository quizRepository;
    private final QuizResultRepository quizResultRepository;
    private final UserAnswerRepository userAnswerRepository;
    private final QuestionRepository questionRepository;
    private final QuestionDrawer questionDrawer;
    private final Clock clock;

    public AttemptService(QuizRepository quizRepository, QuizResultRepository quizResultRepository,
            UserAnswerRepository userAnswerRepository, QuestionRepository questionRepository,
            QuestionDrawer questionDrawer, Clock clock) {
        this.quizRepository = quizRepository;
        this.quizResultRepository = quizResultRepository;
        this.userAnswerRepository = userAnswerRepository;
        this.questionRepository = questionRepository;
        this.questionDrawer = questionDrawer;
        this.clock = clock;
    }

    /**
     * Rút câu và tạo lượt làm mới. Thời gian làm bài chỉ áp dụng cho thi thử.
     *
     * @throws ResourceNotFoundException nếu không có đề, hoặc đề/môn chưa publish
     * @throws BusinessRuleException     nếu phạm vi của đề chưa có câu PUBLISHED nào
     */
    public AttemptResponse start(Long quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .filter(found -> found.isPublished() && found.getSubject().isPublished())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề này."));
        List<Long> candidates = quiz.getChapter() != null
                ? questionRepository.findIdsByChapterIdAndStatus(quiz.getChapter().getId(), QuestionStatus.PUBLISHED)
                : questionRepository.findIdsBySubjectIdAndStatus(quiz.getSubject().getId(), QuestionStatus.PUBLISHED);
        if (candidates.isEmpty()) {
            throw new BusinessRuleException("Đề này chưa có câu hỏi nào để làm.");
        }

        List<Long> drawn = questionDrawer.draw(candidates, quiz.getQuestionCount(), quiz.isShuffleQuestions());
        Map<Long, Question> questions = loadQuestions(drawn);
        Instant now = now();
        Instant expiresAt = quiz.getMode() == QuizMode.EXAM && quiz.getTimeLimitMinutes() != null
                ? now.plus(Duration.ofMinutes(quiz.getTimeLimitMinutes()))
                : null;
        QuizResult attempt = new QuizResult(quiz, UUID.randomUUID().toString(), now, expiresAt);
        drawn.forEach(id -> attempt.addQuestion(questions.get(id)));
        quizResultRepository.save(attempt);
        return AttemptMapper.toResponse(attempt, attempt.getAnswers(), questions, now);
    }

    /** Mở lại lượt làm (tải lại trang). Thi thử đã quá hạn thì được chấm và trả về kết quả. */
    public AttemptResponse get(String attemptId) {
        QuizResult attempt = quizResultRepository.findByPublicId(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt làm bài này."));
        Instant now = now();
        if (isOverdue(attempt, now)) {
            // Chỉ khoá dòng khi phải chấm bài quá hạn; mở lại bình thường (kể cả luyện tập) không khoá.
            // Yêu cầu khác có thể vừa chấm xong: chấm lại vẫn ra đúng kết quả đó, vì sau hạn không lưu thêm
            // được câu nào và thời điểm kết thúc là hạn nộp.
            attempt = lockAttempt(attemptId);
        }
        List<UserAnswer> answers = userAnswerRepository.findWithQuestionByQuizResultId(attempt.getId());
        expireIfOverdue(attempt, answers, now);
        return AttemptMapper.toResponse(attempt, answers, loadQuestionsOf(answers), now);
    }

    /**
     * Lưu lựa chọn cho một câu. Luyện tập: chấm ngay và trả phản hồi; thi thử: chỉ lưu.
     *
     * @throws BusinessRuleException     nếu lượt làm đã kết thúc / hết giờ, hoặc câu luyện tập đã trả lời
     * @throws ResourceNotFoundException nếu câu không thuộc lượt làm
     * @throws InvalidRequestException   nếu phương án không thuộc câu hỏi
     */
    // Lưu sau hạn: bài được chấm (EXPIRED) rồi mới báo lỗi. Không rollback khi báo lỗi nghiệp vụ để kết quả
    // chấm đó được lưu; các lỗi nghiệp vụ khác ở đây đều xảy ra trước khi ghi gì.
    @Transactional(noRollbackFor = BusinessRuleException.class)
    public SaveAnswerResponse saveAnswer(String attemptId, Long questionId, Long answerId) {
        QuizResult attempt = lockAttempt(attemptId);
        Instant now = now();
        List<UserAnswer> answers = userAnswerRepository.findWithQuestionByQuizResultId(attempt.getId());
        if (expireIfOverdue(attempt, answers, now)) {
            throw new BusinessRuleException("Đã hết giờ làm bài. Bài đã được chấm với các câu đã lưu.");
        }
        requireInProgress(attempt);

        UserAnswer userAnswer = answers.stream()
                .filter(answer -> answer.getQuestion().getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Câu hỏi này không có trong lượt làm."));
        Question question = loadQuestions(List.of(questionId)).get(questionId);
        Answer chosen = question.getAnswers().stream()
                .filter(answer -> answer.getId().equals(answerId))
                .findFirst()
                .orElseThrow(() -> new InvalidRequestException("Phương án đã chọn không thuộc câu hỏi này."));

        if (attempt.getQuiz().getMode() == QuizMode.PRACTICE) {
            if (userAnswer.isAnswered()) {
                throw new BusinessRuleException("Câu này đã trả lời. Ở chế độ luyện tập không đổi được đáp án.");
            }
            userAnswer.select(chosen, now);
            userAnswer.grade();
            return new SaveAnswerResponse(questionId, answerId, AttemptMapper.toFeedback(userAnswer, question));
        }
        userAnswer.select(chosen, now);
        return new SaveAnswerResponse(questionId, answerId, null);
    }

    /**
     * Nộp bài thi thử và chấm điểm. Nộp sau hạn (quá thời gian cho phép trễ) thì vẫn chấm, trạng thái EXPIRED.
     * Bài đã kết thúc thì trả lại kết quả đã có (nộp lại khi mất phản hồi của lần trước không bị báo lỗi).
     *
     * @throws BusinessRuleException nếu là lượt luyện tập
     */
    public AttemptResponse submit(String attemptId) {
        QuizResult attempt = lockAttempt(attemptId);
        if (attempt.getQuiz().getMode() == QuizMode.PRACTICE) {
            throw new BusinessRuleException("Chế độ luyện tập không cần nộp bài.");
        }
        Instant now = now();
        List<UserAnswer> answers = userAnswerRepository.findWithQuestionByQuizResultId(attempt.getId());
        if (attempt.isInProgress() && !expireIfOverdue(attempt, answers, now)) {
            grade(attempt, answers, QuizResultStatus.SUBMITTED, now);
        }
        return AttemptMapper.toResponse(attempt, answers, loadQuestionsOf(answers), now);
    }

    private QuizResult lockAttempt(String attemptId) {
        return quizResultRepository.findForUpdateByPublicId(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt làm bài này."));
    }

    private static void requireInProgress(QuizResult attempt) {
        if (!attempt.isInProgress()) {
            throw new BusinessRuleException("Bài này đã nộp, không sửa được nữa.");
        }
    }

    /** Thi thử đang làm mà đã quá hạn, kể cả thời gian cho phép trễ. */
    private static boolean isOverdue(QuizResult attempt, Instant now) {
        return attempt.isInProgress() && attempt.isPastDeadline(now.minus(DEADLINE_GRACE));
    }

    /**
     * Chấm bài quá hạn và chuyển EXPIRED. Thời điểm kết thúc ghi là hạn nộp (bài hết giờ lúc đó),
     * không phải lúc có người mở lại bài.
     */
    private static boolean expireIfOverdue(QuizResult attempt, List<UserAnswer> answers, Instant now) {
        if (!isOverdue(attempt, now)) {
            return false;
        }
        grade(attempt, answers, QuizResultStatus.EXPIRED, attempt.getExpiresAt());
        return true;
    }

    private static void grade(QuizResult attempt, List<UserAnswer> answers, QuizResultStatus status,
            Instant finishedAt) {
        answers.forEach(UserAnswer::grade);
        int correct = (int) answers.stream().filter(answer -> Boolean.TRUE.equals(answer.getCorrect())).count();
        attempt.finish(status, correct, ScoreCalculator.score(correct, answers.size()), finishedAt);
    }

    private Map<Long, Question> loadQuestionsOf(List<UserAnswer> answers) {
        return loadQuestions(answers.stream().map(answer -> answer.getQuestion().getId()).toList());
    }

    /** Câu hỏi kèm phương án, nạp trong một truy vấn. */
    private Map<Long, Question> loadQuestions(List<Long> ids) {
        return questionRepository.findWithAnswersByIdIn(ids).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
    }

    /** MySQL lưu thời gian tới micro giây; cắt bớt để giá trị trả về khớp giá trị đọc lại sau này. */
    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
