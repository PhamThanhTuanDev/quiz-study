/**
 * Nhãn của câu soạn thêm, không có trong tài liệu nguồn của môn (D-053), để người học phân biệt với câu của
 * tài liệu. Đặt cạnh tiêu đề "Câu N/M" chứ không nằm trong tiêu đề, để tên của câu giữ nguyên "Câu N/M".
 */
export default function AuthoredBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
      Câu tự soạn
    </span>
  )
}
