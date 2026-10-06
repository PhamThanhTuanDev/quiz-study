import { useCallback, useId } from 'react'
import { Link, useParams } from 'react-router'
import AsyncContent from '../components/AsyncContent'
import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { useAsync } from '../hooks/useAsync'
import { useStartAttempt, type StartAttemptControls } from '../hooks/useStartAttempt'
import { getQuizzes } from '../services/quizService'
import { getSubject } from '../services/subjectService'
import type { QuizSummary } from '../types/quiz'
import type { SubjectDetail } from '../types/subject'
import NotFoundPage from './NotFoundPage'

interface SubjectWithQuizzes {
  subject: SubjectDetail
  quizzes: QuizSummary[]
}

export default function SubjectPage() {
  const { slug = '' } = useParams()
  // useCallback giữ hàm ổn định giữa các lần render; chỉ đổi khi sang môn khác (yêu cầu của useAsync).
  const load = useCallback(
    async (signal: AbortSignal): Promise<SubjectWithQuizzes> => {
      const [subject, quizzes] = await Promise.all([getSubject(slug, signal), getQuizzes(slug, signal)])
      return { subject, quizzes }
    },
    [slug],
  )
  const { state, reload } = useAsync(load)

  // Môn không tồn tại: thử lại cũng vô ích, nên hiện trang "không tìm thấy" thay vì nút "Thử lại".
  if (state.kind === 'error' && state.status === 404) {
    return <NotFoundPage title="Không tìm thấy môn học" message={state.message} />
  }

  return (
    <AsyncContent state={state} onRetry={reload} loadingMessage="Đang tải môn học…" errorTitle="Không tải được môn học">
      {(data) => <SubjectDetails {...data} />}
    </AsyncContent>
  )
}

function SubjectDetails({ subject, quizzes }: SubjectWithQuizzes) {
  const chaptersHeadingId = useId()
  const starter = useStartAttempt()
  const exam = quizzes.find((quiz) => quiz.mode === 'EXAM' && quiz.chapterId === null)
  const practiceByChapter = new Map(
    quizzes.filter((quiz) => quiz.mode === 'PRACTICE' && quiz.chapterId !== null).map((quiz) => [quiz.chapterId, quiz]),
  )

  return (
    <div className="space-y-6">
      <title>{`${subject.name} · Quiz Study`}</title>
      <Link to="/" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
        ← Tất cả môn học
      </Link>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{subject.name}</h1>
        <p className="mt-2 text-muted">
          {subject.chapters.length} bài · {subject.questionCount} câu hỏi
        </p>
        {subject.description && <p className="mt-3">{subject.description}</p>}
      </div>

      {starter.error && <ErrorState title="Không bắt đầu được bài làm" message={starter.error} />}

      {exam && exam.questionCount > 0 && <ExamCard exam={exam} starter={starter} />}

      <section aria-labelledby={chaptersHeadingId}>
        <h2 id={chaptersHeadingId} className="text-lg font-semibold">
          Các bài
        </h2>
        <p className="mt-1 text-sm text-muted">
          Học: xem câu hỏi kèm đáp án đúng. Luyện tập: trả lời câu nào biết ngay câu đó đúng hay sai.
        </p>
        {subject.chapters.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Môn này chưa có bài nào" />
          </div>
        ) : (
          <ol className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {subject.chapters.map((chapter) => {
              const practice = practiceByChapter.get(chapter.id)
              const practiceLabel = starter.pendingQuizId === practice?.id ? 'Đang tạo…' : 'Luyện tập'
              return (
                <li key={chapter.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1">
                    {chapter.code && <p className="text-sm font-semibold text-primary">{chapter.code}</p>}
                    <p>{chapter.title}</p>
                    <p className="text-sm text-muted">{chapter.questionCount} câu</p>
                  </div>
                  <div className="flex gap-2">
                    {chapter.questionCount > 0 && (
                      <ButtonLink
                        variant="secondary"
                        to={`/subjects/${subject.slug}/chapters/${chapter.id}/study`}
                        aria-label={`Học ${chapter.title}`}
                      >
                        Học
                      </ButtonLink>
                    )}
                    {practice && practice.questionCount > 0 && (
                      <Button
                        variant="secondary"
                        // Nhiều nút cùng chữ "Luyện tập": thêm tên bài để trình đọc màn hình phân biệt.
                        // Tên bắt đầu bằng đúng chữ đang hiện, để người dùng giọng nói gọi được nút.
                        aria-label={`${practiceLabel} ${chapter.title}`}
                        onClick={() => void starter.start(practice.id)}
                        disabled={starter.pendingQuizId !== null}
                      >
                        {practiceLabel}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

function ExamCard({ exam, starter }: { exam: QuizSummary; starter: StartAttemptControls }) {
  return (
    <Card title="Thi thử cả môn">
      <p className="text-muted">
        {exam.questionCount} câu ngẫu nhiên
        {exam.timeLimitMinutes !== null && ` · ${exam.timeLimitMinutes} phút`} · chấm điểm thang 10 sau khi nộp bài
      </p>
      <Button className="mt-4" onClick={() => void starter.start(exam.id)} disabled={starter.pendingQuizId !== null}>
        {starter.pendingQuizId === exam.id ? 'Đang tạo bài thi…' : 'Bắt đầu thi thử'}
      </Button>
    </Card>
  )
}
