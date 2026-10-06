/** Một phương án trong chế độ "Học" (khớp StudyAnswerResponse): có luôn đúng / sai để tô đáp án đúng. */
export interface StudyAnswer {
  id: number
  content: string
  correct: boolean
  /** Câu điền khuyết: giá trị từng chỗ trống theo thứ tự (D-048); null với phương án thường. */
  blanks: string[] | null
}

/** Một câu trong chế độ "Học" (khớp StudyQuestionResponse). Phương án theo đúng thứ tự tài liệu. */
export interface StudyQuestion {
  questionId: number
  order: number
  content: string
  codeSnippet: string | null
  answers: StudyAnswer[]
  /** Giải thích / ghi chú "Đã sửa so với tài liệu"; có thể không có. */
  explanation: string | null
}

/** Chế độ "Học" của một bài (khớp StudyChapterResponse ở backend, D-044). */
export interface StudyChapter {
  subjectSlug: string
  subjectName: string
  chapterId: number
  chapterCode: string | null
  chapterTitle: string
  questions: StudyQuestion[]
}
