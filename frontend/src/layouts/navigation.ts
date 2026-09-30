export interface NavItem {
  to: string
  label: string
  /** true: chỉ đánh dấu "đang xem" khi URL khớp chính xác (dùng cho "/"). */
  end?: boolean
}

/** Các mục trong thanh điều hướng chính. Thêm trang mới thì thêm vào đây. */
export const NAV_ITEMS: NavItem[] = [{ to: '/', label: 'Trang chủ', end: true }]
