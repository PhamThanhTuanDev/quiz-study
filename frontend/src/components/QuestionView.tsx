import { useId, useState, type Ref } from 'react'
import { useFocusOnChange } from '../hooks/useFocusOnChange'
import { useHotkey } from '../hooks/useHotkey'
import type { AnswerOption, AttemptQuestion, AnswerFeedback, QuizMode } from '../types/quiz'
import Button from './Button'
import CodeBlock from './CodeBlock'
import ShortcutHint from './ShortcutHint'

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
 * Một câu hỏi và các phương án. Thi thử: chọn là lưu ngay, đổi được; nộp xong thì xem lại đúng/sai từng câu.
 * Luyện tập: chọn rồi bấm "Kiểm tra" (để lỡ tay, hoặc dùng phím mũi tên đi qua các phương án, không bị khoá
 * đáp án); sau đó hiện đúng/sai.
 */
export default function QuestionView({ question, total, mode, locked, checking, onChoose, headingRef }: QuestionViewProps) {
  const [picked, setPicked] = useState<number | null>(question.selectedAnswerId)
  const feedback = question.feedback
  const isPractice = mode === 'PRACTICE'
  // Có feedback nghĩa là server cho xem đáp án: câu luyện tập đã kiểm tra, hoặc bài thi đã kết thúc.
  const revealed = feedback !== null
  const practiceChecked = isPractice && revealed
  const disabled = locked || revealed || checking
  const checkedId = isPractice && !revealed ? picked : question.selectedAnswerId
  // Nút "Kiểm tra" biến mất khi có kết quả: đưa focus tới kết quả để người dùng bàn phím / trình đọc màn hình
  // nghe được ngay đúng hay sai (không áp dụng khi mở lại câu đã kiểm tra từ trước). Thi thử vừa nộp thì trang
  // đưa focus tới thẻ kết quả, không phải tới từng câu.
  const feedbackRef = useFocusOnChange<HTMLDivElement>(practiceChecked)
  const canCheck = isPractice && !revealed && !locked
  const check = () => {
    if (picked !== null) onChoose(picked)
  }
  // Enter = bấm "Kiểm tra" (song song với bấm chuột).
  useHotkey('Enter', check, canCheck && !checking)

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
            feedback={feedback}
            selectedAnswerId={question.selectedAnswerId}
            onSelect={select}
          />
        ))}
      </fieldset>

      {canCheck && (
        <ShortcutHint keys="Enter">
          <Button onClick={check} disabled={picked === null || checking} aria-keyshortcuts="Enter">
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra'}
          </Button>
        </ShortcutHint>
      )}
      {revealed && (
        <FeedbackMessage
          feedback={feedback}
          answers={question.answers}
          skipped={question.selectedAnswerId === null}
          containerRef={feedbackRef}
        />
      )}
    </article>
  )
}

interface AnswerChoiceProps {
  name: string
  answer: AnswerOption
  letter: string
  checked: boolean
  disabled: boolean
  /** Có khi được xem đáp án (luyện tập đã kiểm tra, thi thử đã nộp): tô đáp án đúng và lựa chọn sai. */
  feedback: AnswerFeedback | null
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
  feedback: AnswerFeedback
  answers: AnswerOption[]
  /** Thi thử đã nộp mà câu này bỏ trống. */
  skipped: boolean
  containerRef: Ref<HTMLDivElement>
}

const FEEDBACK_TONE = {
  correct: { box: 'border-success bg-success-soft', text: 'text-success', title: '✓ Chính xác!' },
  wrong: { box: 'border-danger bg-danger-soft', text: 'text-danger', title: '✗ Chưa đúng.' },
  skipped: { box: 'border-warning bg-warning-soft', text: 'text-warning', title: '– Bạn bỏ trống câu này.' },
} as const

function FeedbackMessage({ feedback, answers, skipped, containerRef }: FeedbackMessageProps) {
  const headingId = useId()
  const correctIndex = answers.findIndex((answer) => answer.id === feedback.correctAnswerId)
  const tone = FEEDBACK_TONE[feedback.correct ? 'correct' : skipped ? 'skipped' : 'wrong']

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="status"
      aria-labelledby={headingId}
      className={`rounded-lg border p-4 focus:outline-none ${tone.box}`}
    >
      <p id={headingId} className={`font-semibold ${tone.text}`}>
        {tone.title}
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
