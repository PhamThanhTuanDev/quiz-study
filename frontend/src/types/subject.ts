/** Một môn trong danh sách (khớp SubjectSummaryResponse ở backend). */
export interface SubjectSummary {
  slug: string
  name: string
  code: string | null
  description: string | null
  chapterCount: number
  /** Số câu dùng được trong bài làm. */
  questionCount: number
}

/** Một bài của môn (khớp ChapterSummaryResponse ở backend). */
export interface ChapterSummary {
  id: number
  /** Nhãn bài hiển thị được, ví dụ "Bài 1"; có thể không có. */
  code: string | null
  title: string
  displayOrder: number
  questionCount: number
}

/** Chi tiết môn kèm các bài (khớp SubjectDetailResponse ở backend). */
export interface SubjectDetail {
  slug: string
  name: string
  code: string | null
  description: string | null
  questionCount: number
  chapters: ChapterSummary[]
}
