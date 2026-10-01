import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ExamOutcome, PracticeOutcome } from '../components/AttemptOutcome'
import AsyncContent from '../components/AsyncContent'
import Button from '../components/Button'
import CountdownTimer from '../components/CountdownTimer'
import ErrorState from '../components/ErrorState'
import QuestionNavigator from '../components/QuestionNavigator'
import QuestionView from '../components/QuestionView'
import SubmitConfirm from '../components/SubmitConfirm'
import { useAsync } from '../hooks/useAsync'
import { useQuizAttempt } from '../hooks/useQuizAttempt'
import { useStartAttempt } from '../hooks/useStartAttempt'
import { getAttempt } from '../services/quizService'
import type { Attempt } from '../types/quiz'
import NotFoundPage from './NotFoundPage'

const MODE_LABEL = { PRACTICE: 'Luyện tập', EXAM: 'Thi thử' } as const

export default function AttemptPage() {
  const { attemptId = '' } = useParams()
  const load = useCallback((signal: AbortSignal) => getAttempt(attemptId, signal), [attemptId])
  const { state, reload } = useAsync(load)

  if (state.kind === 'error' && state.status === 404) {
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
  const { attempt, currentIndex, goTo, choose, checkingQuestionId, submit, submitting, error } =
    useQuizAttempt(initial)
  const restart = useStartAttempt()
  const [confirming, setConfirming] = useState(false)
  const questionHeadingRef = useFocusOnChange<HTMLHeadingElement>(currentIndex)

  const isExam = attempt.mode === 'EXAM'
  const finished = attempt.status !== 'IN_PROGRESS'
  const total = attempt.questions.length
  const answeredCount = attempt.questions.filter((question) => question.selectedAnswerId !== null).length
  const practiceDone = !isExam && answeredCount === total
  const question = attempt.questions[currentIndex]

  const restartProps = {
    subjectSlug: attempt.subjectSlug,
    onRestart: () => void restart.start(attempt.quizId),
    restarting: restart.pendingQuizId !== null,
  }

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
          <p className="mt-1 text-muted">
            Đã trả lời {answeredCount}/{total} câu
          </p>
        </div>
        {isExam && !finished && attempt.remainingSeconds !== null && (
          <CountdownTimer remainingSeconds={attempt.remainingSeconds} onExpire={() => void submit()} />
        )}
      </header>

      {isExam && finished && attempt.result && (
        <ExamOutcome result={attempt.result} status={attempt.status} {...restartProps} />
      )}
      {practiceDone && <PracticeOutcome questionCount={total} {...restartProps} />}
      {error && <ErrorState title="Chưa thực hiện được" message={error} />}
      {restart.error && <ErrorState title="Không tạo được lượt làm mới" message={restart.error} />}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6">
            <QuestionView
              key={question.questionId}
              question={question}
              total={total}
              mode={attempt.mode}
              locked={finished}
              checking={checkingQuestionId === question.questionId}
              onChoose={(answerId) => void choose(question.questionId, answerId)}
              headingRef={questionHeadingRef}
            />
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="secondary" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
              ← Câu trước
            </Button>
            <Button variant="secondary" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1}>
              Câu sau →
            </Button>
          </div>

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
 * Chuyển focus tới phần tử (tiêu đề câu) mỗi khi `value` đổi, trừ lần hiện đầu tiên: người dùng bàn phím
 * và trình đọc màn hình biết đã sang câu mới mà không phải dò lại từ đầu trang.
 */
function useFocusOnChange<T extends HTMLElement>(value: unknown) {
  const ref = useRef<T>(null)
  const firstValue = useRef(value)
  useEffect(() => {
    if (value !== firstValue.current) {
      ref.current?.focus()
      firstValue.current = undefined // từ đây mọi lần đổi đều chuyển focus
    }
  }, [value])
  return ref
}
