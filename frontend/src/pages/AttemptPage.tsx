import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ExamOutcome, PracticeOutcome } from '../components/AttemptOutcome'
import AsyncContent from '../components/AsyncContent'
import Button from '../components/Button'
import CountdownTimer from '../components/CountdownTimer'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import QuestionNavigator from '../components/QuestionNavigator'
import QuestionView from '../components/QuestionView'
import ShortcutHint from '../components/ShortcutHint'
import SubmitConfirm from '../components/SubmitConfirm'
import { useAsync } from '../hooks/useAsync'
import { useFocusOnChange } from '../hooks/useFocusOnChange'
import { useHotkey } from '../hooks/useHotkey'
import { useSwipe } from '../hooks/useSwipe'
import { useQuizAttempt } from '../hooks/useQuizAttempt'
import { useStartAttempt } from '../hooks/useStartAttempt'
import { getAttempt } from '../services/quizService'
import { forgetAttempt } from '../services/recentAttempts'
import type { Attempt } from '../types/quiz'
import NotFoundPage from './NotFoundPage'

const MODE_LABEL = { PRACTICE: 'Luyện tập', EXAM: 'Thi thử' } as const

export default function AttemptPage() {
  const { attemptId = '' } = useParams()
  const load = useCallback((signal: AbortSignal) => getAttempt(attemptId, signal), [attemptId])
  const { state, reload } = useAsync(load)
  const notFound = state.kind === 'error' && state.status === 404

  // Lượt làm không còn trên server: bỏ khỏi "Lượt làm gần đây" để danh sách không trỏ tới trang lỗi.
  useEffect(() => {
    if (notFound) forgetAttempt(attemptId)
  }, [notFound, attemptId])

  if (notFound) {
    return <NotFoundPage title="Không tìm thấy lượt làm bài" message={state.message} />
  }

  return (
    <AsyncContent state={state} onRetry={reload} loadingMessage="Đang tải bài làm…" errorTitle="Không tải được bài làm">
      {/* key: sang lượt làm khác ("Làm lại") thì bắt đầu lại trạng thái từ đầu. */}
      {(attempt) => <AttemptView key={attempt.id} initial={attempt} />}
    </AsyncContent>
  )
}

function AttemptView({ initial }: { initial: Attempt }) {
  if (initial.questions.length === 0) {
    // Server không tạo lượt làm rỗng; phòng trường hợp dữ liệu lạ thay vì để trang bị lỗi.
    return <EmptyState title="Lượt làm này không có câu hỏi nào" />
  }
  return <AttemptContent initial={initial} />
}

function AttemptContent({ initial }: { initial: Attempt }) {
  const { attempt, currentIndex, goTo, choose, checkingQuestionIds, submit, submitting, error } =
    useQuizAttempt(initial)
  const restart = useStartAttempt()
  const [confirming, setConfirming] = useState(false)

  const isExam = attempt.mode === 'EXAM'
  const finished = attempt.status !== 'IN_PROGRESS'
  const total = attempt.questions.length
  const answeredCount = attempt.questions.filter((question) => question.selectedAnswerId !== null).length
  const practiceDone = !isExam && answeredCount === total
  const showTimerBar = isExam && !finished && attempt.remainingSeconds !== null
  const question = attempt.questions[currentIndex]
  const questionHeadingRef = useFocusOnChange<HTMLHeadingElement>(currentIndex)
  // Vừa nộp bài / vừa làm hết lượt luyện tập: nút đang focus biến mất, nên đưa focus tới kết quả.
  const outcomeRef = useFocusOnChange<HTMLDivElement>(finished || practiceDone)

  const restartProps = {
    subjectSlug: attempt.subjectSlug,
    onRestart: () => void restart.start(attempt.quizId),
    restarting: restart.pendingQuizId !== null,
  }
  const nextMistake = nextMistakeIndex(attempt, currentIndex)
  const goPrevious = () => goTo(currentIndex - 1)
  const goNext = () => goTo(currentIndex + 1)
  // ← → chuyển câu, song song với bấm nút "Câu trước" / "Câu sau"; trên điện thoại thì vuốt (như lật trang).
  useHotkey('ArrowLeft', goPrevious)
  useHotkey('ArrowRight', goNext)
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrevious })

  return (
    <div className="space-y-6">
      <title>{`${attempt.quizTitle} · Quiz Study`}</title>
      <Link
        to={`/subjects/${attempt.subjectSlug}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
      >
        ← {attempt.subjectName}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">{MODE_LABEL[attempt.mode]}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{attempt.quizTitle}</h1>
          {!showTimerBar && (
            <p className="mt-1 text-muted">
              Đã trả lời {answeredCount}/{total} câu
            </p>
          )}
        </div>
      </header>

      {showTimerBar && attempt.remainingSeconds !== null && (
        // Dính ở đầu màn hình khi cuộn: câu hỏi dài (nhất là trên điện thoại), cuộn xuống vẫn thấy giờ còn lại.
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <p className="text-sm text-muted">
            Đã trả lời {answeredCount}/{total} câu
          </p>
          <CountdownTimer remainingSeconds={attempt.remainingSeconds} onExpire={() => void submit()} />
        </div>
      )}

      <div ref={outcomeRef} tabIndex={-1} className="focus:outline-none">
        {isExam && finished && attempt.result && (
          <ExamOutcome
            result={attempt.result}
            status={attempt.status}
            onReviewNextMistake={nextMistake === null ? null : () => goTo(nextMistake)}
            {...restartProps}
          />
        )}
        {practiceDone && <PracticeOutcome questionCount={total} {...restartProps} />}
      </div>
      {error && <ErrorState title="Chưa thực hiện được" message={error} />}
      {restart.error && <ErrorState title="Không tạo được lượt làm mới" message={restart.error} />}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6" {...swipeHandlers}>
            <QuestionView
              key={question.questionId}
              question={question}
              total={total}
              mode={attempt.mode}
              locked={finished}
              checking={checkingQuestionIds.has(question.questionId)}
              onChoose={(answerId) => void choose(question.questionId, answerId)}
              headingRef={questionHeadingRef}
            />
          </div>

          <div className="flex justify-between gap-3">
            <ShortcutHint keys="←">
              <Button variant="secondary" onClick={goPrevious} disabled={currentIndex === 0} aria-keyshortcuts="ArrowLeft">
                ← Câu trước
              </Button>
            </ShortcutHint>
            <ShortcutHint keys="→">
              <Button variant="secondary" onClick={goNext} disabled={currentIndex === total - 1} aria-keyshortcuts="ArrowRight">
                Câu sau →
              </Button>
            </ShortcutHint>
          </div>
          {/* Chỉ hiện trên màn hình cảm ứng: máy tính đã có gợi ý phím tắt trên nút. */}
          <p className="text-center text-sm text-muted pointer-fine:hidden">Vuốt trái / phải trên câu hỏi để chuyển câu.</p>

          {isExam && !finished && (
            confirming ? (
              <SubmitConfirm
                unansweredCount={total - answeredCount}
                submitting={submitting}
                onConfirm={() => void submit()}
                onCancel={() => setConfirming(false)}
              />
            ) : (
              <Button className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
                Nộp bài
              </Button>
            )
          )}
        </div>

        <aside className="mt-6 lg:mt-0" aria-label="Các câu hỏi">
          <QuestionNavigator questions={attempt.questions} currentIndex={currentIndex} onSelect={goTo} />
        </aside>
      </div>
    </div>
  )
}

/**
 * Câu sai hoặc bỏ trống tiếp theo sau câu đang xem (quay vòng về đầu), để xem lại lần lượt;
 * null nếu không còn câu sai nào khác câu đang xem (khi đó ẩn nút, vì bấm cũng không đi đâu).
 */
function nextMistakeIndex(attempt: Attempt, currentIndex: number): number | null {
  const total = attempt.questions.length
  for (let step = 1; step < total; step++) {
    const index = (currentIndex + step) % total
    const feedback = attempt.questions[index].feedback
    if (feedback !== null && !feedback.correct) return index
  }
  return null
}
