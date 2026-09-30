/** Một trường dữ liệu không hợp lệ (khớp `dto/InvalidField` ở backend). */
export interface InvalidField {
  /** Tên trường hoặc tham số; null nếu lỗi thuộc cả request. */
  field: string | null
  message: string
}

/** Lỗi theo chuẩn Problem Details (RFC 9457) mà backend trả về. `detail` là tiếng Việt. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  /** Chỉ có ở lỗi 400 do dữ liệu không hợp lệ. */
  errors?: InvalidField[]
}
