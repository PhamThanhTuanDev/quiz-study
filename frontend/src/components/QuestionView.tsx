import { useId, useState, type Ref } from 'react'
import { useFocusOnChange } from '../hooks/useFocusOnChange'
import type { AnswerOption, AttemptQuestion, PracticeFeedback, QuizMode } from '../types/quiz'
import Button from './Button'
import CodeBlock from './CodeBlock'

interface QuestionViewProps {
  question: AttemptQuestion
  total: number
  mode: QuizMode
  /** Lượt làm đã kết thúc (thi thử đã nộp / hết giờ): chỉ xem, không chọn được. */
  locked: boolean
  /** Luyện tập: đang chờ server kiểm tra câu này. */
  checking: boolean
  onChoose: (answerId: number) => void
  /** Để trang chuyển focus tới tiêu đề câu khi người dùng chuyển câu. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * Một câu hỏi và các phương án. Thi thử: chọn là lưu ngay, đổi được. Luyện tập: chọn rồi bấm "Kiểm tra"
 * (để lỡ tay, hoặc dùng phím mũi tên đi qua các phương án, không bị khoá đáp án); sau đó hiện đúng/sai.
 */
export default function QuestionView({ question, total, mode, locked, checking, onChoose, headingRef }: QuestionViewProps) {
  const [picked, setPicked] = useState<number | null>(question.selectedAnswerId)
  const feedback = question.feedback
  const isPractice = mode === 'PRACTICE'
  const answered = isPractice && feedback !== null
  const disabled = locked || answered || checking
  const checkedId = isPractice && !answered ? picked : question.selectedAnswerId
  // Nút "Kiểm tra" biến mất khi có kết quả: đưa focus tới kết quả để người dùng bàn phím / trình đọc màn hình
  // nghe được ngay đúng hay sai (không áp dụng khi mở lại câu đã kiểm tra từ trước).
  const feedbackRef = useFocusOnChange<HTMLDivElement>(answered)

  const select = (answerId: number) => {
    if (isPractice) {
      setPicked(answerId)
    } else {
      onChoose(answerId)
    }
  }

  return (
    <article className="space-y-4">
      <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-primary focus:outline-none">
        Câu {question.order}/{total}
      </h2>
      <p className="text-base whitespace-pre-line sm:text-lg">{question.content}</p>
      {question.codeSnippet && <CodeBlock code={question.codeSnippet} />}

      <fieldset className="space-y-2">
        <legend className="sr-only">Chọn một đáp án</legend>
        {question.answers.map((answer, index) => (
          <AnswerChoice
            key={answer.id}
            name={`question-${question.questionId}`}
            answer={answer}
            letter={letterOf(index)}
            checked={checkedId === answer.id}
            disabled={disabled}
            feedback={answered ? feedback : null}
            selectedAnswerId={question.selectedAnswerId}
            onSelect={select}
          />
        ))}
      </fieldset>

      {isPractice && !answered && !locked && (
        <Button onClick={() => picked !== null && onChoose(picked)} disabled={picked === null || checking}>
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra'}
        </Button>
      )}
      {answered && <FeedbackMessage feedback={feedback} answers={question.answers} containerRef={feedbackRef} />}
    </article>
  )
}

interface AnswerChoiceProps {
  name: string
  answer: AnswerOption
  letter: string
  checked: boolean
  disabled: boolean
  /** Có khi câu luyện tập đã kiểm tra: tô đáp án đúng và lựa chọn sai. */
  feedback: PracticeFeedback | null
  selectedAnswerId: number | null
  onSelect: (answerId: number) => void
}

function AnswerChoice({ name, answer, letter, checked, disabled, feedback, selectedAnswerId, onSelect }: AnswerChoiceProps) {
  const isCorrectAnswer = feedback !== null && feedback.correctAnswerId === answer.id
  const isWrongChoice = feedback !== null && !feedback.correct && selectedAnswerId === answer.id

  let tone = 'border-line bg-surface'
  if (isCorrectAnswer) tone = 'border-success bg-success-soft'
  else if (isWrongChoice) tone = 'border-danger bg-danger-soft'
  else if (checked) tone = 'border-primary bg-primary-soft'

  return (
    <label
      className={`flex min-h-11 items-start gap-3 rounded-lg border px-4 py-3 ${tone} ${
        disabled ? 'cursor-default' : 'cursor-pointer hover:border-primary'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={answer.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(answer.id)}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <span className="shrink-0 font-semibold">{letter}.</span>
      <span className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">{answer.content}</span>
      {isCorrectAnswer && <span className="shrink-0 text-sm font-semibold text-success">✓ Đáp án đúng</span>}
      {isWrongChoice && <span className="shrink-0 text-sm font-semibold text-danger">✗ Bạn chọn</span>}
    </label>
  )
}

interface FeedbackMessageProps {
  feedback: PracticeFeedback
  answers: AnswerOption[]
  containerRef: Ref<HTMLDivElement>
}

function FeedbackMessage({ feedback, answers, containerRef }: FeedbackMessageProps) {
  const headingId = useId()
  const correctIndex = answers.findIndex((answer) => answer.id === feedback.correctAnswerId)

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="status"
      aria-labelledby={headingId}
      className={`rounded-lg border p-4 focus:outline-none ${
        feedback.correct ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft'
      }`}
    >
      <p id={headingId} className={`font-semibold ${feedback.correct ? 'text-success' : 'text-danger'}`}>
        {feedback.correct ? '✓ Chính xác!' : '✗ Chưa đúng.'}
        {!feedback.correct && correctIndex !== -1 && ` Đáp án đúng là ${letterOf(correctIndex)}.`}
      </p>
      {feedback.explanation && <p className="mt-2 text-sm whitespace-pre-line">{feedback.explanation}</p>}
    </div>
  )
}

/** Nhãn A, B, C… theo vị trí hiển thị (phương án đã được xáo cho lượt làm này). */
function letterOf(index: number): string {
  return String.fromCharCode(65 + index)
}
