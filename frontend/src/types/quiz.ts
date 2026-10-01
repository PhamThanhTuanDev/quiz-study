/** Chế độ làm bài (D-037): luyện tập biết ngay đúng/sai từng câu; thi thử chỉ biết sau khi nộp. */
export type QuizMode = 'PRACTICE' | 'EXAM'

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'

/** Một đề của môn (khớp QuizSummaryResponse ở backend). */
export interface QuizSummary {
  id: number
  title: string
  mode: QuizMode
  /** null: đề lấy câu từ cả môn. */
  chapterId: number | null
  chapterTitle: string | null
  chapterOrder: number | null
  /** Số câu thực tế mỗi lượt. */
  questionCount: number
  /** null: không giới hạn thời gian. */
  timeLimitMinutes: number | null
}

export interface AnswerOption {
  id: number
  content: string
}

/** Phản hồi luyện tập cho câu đã trả lời (khớp PracticeFeedbackResponse). */
export interface PracticeFeedback {
  correct: boolean
  correctAnswerId: number | null
  explanation: string | null
}

/** Một câu trong lượt làm. Phương án không có đúng/sai; luyện tập có `feedback` sau khi trả lời. */
export interface AttemptQuestion {
  questionId: number
  order: number
  content: string
  codeSnippet: string | null
  answers: AnswerOption[]
  selectedAnswerId: number | null
  feedback: PracticeFeedback | null
}

/** Kết quả thi thử, thang 10. */
export interface ExamResult {
  correctCount: number
  totalQuestions: number
  score: number
  submittedAt: string
}

/** Một lượt làm bài (khớp AttemptResponse ở backend). */
export interface Attempt {
  /** Mã lượt làm (UUID), dùng trên URL. */
  id: string
  quizId: number
  quizTitle: string
  mode: QuizMode
  subjectSlug: string
  subjectName: string
  status: AttemptStatus
  startedAt: string
  expiresAt: string | null
  /** Số giây còn lại theo đồng hồ server; null nếu không giới hạn hoặc đã kết thúc. */
  remainingSeconds: number | null
  questions: AttemptQuestion[]
  /** Có khi thi thử đã nộp hoặc hết giờ. */
  result: ExamResult | null
}

/** Kết quả lưu lựa chọn (khớp SaveAnswerResponse). */
export interface SaveAnswerResult {
  questionId: number
  selectedAnswerId: number
  feedback: PracticeFeedback | null
}
