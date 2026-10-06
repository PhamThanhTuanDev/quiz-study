import { useCallback, useId } from 'react'
import { Link, useParams } from 'react-router'
import AsyncContent from '../components/AsyncContent'
import CodeBlock from '../components/CodeBlock'
import EmptyState from '../components/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { getStudyChapter } from '../services/studyService'
import type { StudyAnswer, StudyChapter, StudyQuestion } from '../types/study'
import NotFoundPage from './NotFoundPage'

/**
 * Chế độ "Học" (D-044): đọc lần lượt mọi câu của một bài, đáp án đúng tô sẵn màu xanh; không chọn, không chấm.
 * Hiện cả bài trên một trang để cuộn đọc liền mạch (trên điện thoại cũng vậy).
 */
export default function StudyPage() {
  const { slug = '', chapterId = '' } = useParams()
  const load = useCallback((signal: AbortSignal) => getStudyChapter(slug, chapterId, signal), [slug, chapterId])
  const { state, reload } = useAsync(load)

  if (state.kind === 'error' && state.status === 404) {
    return <NotFoundPage title="Không tìm thấy bài học" message={state.message} />
  }

  return (
    <AsyncContent state={state} onRetry={reload} loadingMessage="Đang tải bài học…" errorTitle="Không tải được bài học">
      {(chapter) => <StudyContent chapter={chapter} />}
    </AsyncContent>
  )
}

function StudyContent({ chapter }: { chapter: StudyChapter }) {
  const total = chapter.questions.length
  return (
    <div className="space-y-6">
      <title>{`Học: ${chapter.chapterTitle} · Quiz Study`}</title>
      <Link
        to={`/subjects/${chapter.subjectSlug}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
      >
        ← {chapter.subjectName}
      </Link>

      <header>
        <p className="text-sm font-semibold text-primary">Học{chapter.chapterCode && ` · ${chapter.chapterCode}`}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{chapter.chapterTitle}</h1>
        <p className="mt-1 text-muted">{total} câu · đáp án đúng được tô xanh</p>
      </header>

      {total === 0 ? (
        <EmptyState title="Bài này chưa có câu hỏi nào" />
      ) : (
        <ol className="space-y-4">
          {chapter.questions.map((question) => (
            <li key={question.questionId}>
              <StudyQuestionCard question={question} total={total} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function StudyQuestionCard({ question, total }: { question: StudyQuestion; total: number }) {
  const headingId = useId()
  return (
    <article aria-labelledby={headingId} className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6">
      <h2 id={headingId} className="text-sm font-semibold text-primary">
        Câu {question.order}/{total}
      </h2>
      <p className="text-base whitespace-pre-line sm:text-lg">{question.content}</p>
      {question.codeSnippet && <CodeBlock code={question.codeSnippet} />}
      <ul className="space-y-2" aria-label="Các phương án">
        {question.answers.map((answer, index) => (
          <StudyAnswerRow key={answer.id} answer={answer} letter={String.fromCharCode(65 + index)} />
        ))}
      </ul>
      {question.explanation && (
        <p className="rounded-lg border border-line bg-canvas p-3 text-sm whitespace-pre-line">{question.explanation}</p>
      )}
    </article>
  )
}

function StudyAnswerRow({ answer, letter }: { answer: StudyAnswer; letter: string }) {
  // Không chỉ dựa vào màu: đáp án đúng có thêm chữ "✓ Đáp án đúng".
  const tone = answer.correct ? 'border-success bg-success-soft' : 'border-line bg-surface'
  return (
    <li className={`flex min-h-11 items-start gap-3 rounded-lg border px-4 py-3 ${tone}`}>
      <span className="shrink-0 font-semibold">{letter}.</span>
      <span className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">{answer.content}</span>
      {answer.correct && <span className="shrink-0 text-sm font-semibold text-success">✓ Đáp án đúng</span>}
    </li>
  )
}
