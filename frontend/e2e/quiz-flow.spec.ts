import { expect, test, type Page } from '@playwright/test'

/**
 * Luồng chính trên điện thoại và máy tính: chọn môn → học (xem đáp án) → luyện tập (kiểm tra từng câu) → thi thử
 * (nộp, xem lại) → "Lượt làm gần đây". Không phụ thuộc môn cụ thể nào: luôn chọn môn đầu tiên trong danh sách.
 */

async function openFirstSubject(page: Page) {
  await page.goto('/')
  // Tìm trong <main>: thanh điều hướng phía trên cũng là một danh sách link ("Trang chủ").
  const firstSubject = page.getByRole('main').getByRole('list').first().getByRole('link').first()
  await expect(firstSubject).toBeVisible()
  await firstSubject.click()
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

test('luyện tập: chọn đáp án, kiểm tra, biết ngay đúng hay sai, rồi sang câu sau', async ({ page, isMobile }) => {
  await openFirstSubject(page)
  await page.getByRole('button', { name: /^Luyện tập / }).first().click()

  await expect(page.getByRole('heading', { name: /^Câu 1\// })).toBeVisible()
  await page.getByRole('radio').first().check()
  if (isMobile) {
    await page.getByRole('button', { name: 'Kiểm tra' }).click()
  } else {
    await page.keyboard.press('Enter') // phím tắt thay cho bấm "Kiểm tra"
  }
  await expect(page.getByRole('status')).toContainText(/Chính xác|Chưa đúng/)
  await expect(page.getByRole('radio').first()).toBeDisabled()

  if (isMobile) {
    await page.getByRole('button', { name: 'Câu sau →' }).click()
  } else {
    await page.keyboard.press('ArrowRight')
  }
  await expect(page.getByRole('heading', { name: /^Câu 2\// })).toBeVisible()
})

test('học: xem cả bài, mỗi câu có đúng một đáp án tô xanh, không có ô chọn', async ({ page }) => {
  await openFirstSubject(page)
  await page.getByRole('link', { name: /^Học / }).first().click()

  await expect(page).toHaveURL(/\/chapters\/\d+\/study$/)
  const questions = page.getByRole('article')
  await expect(questions.first()).toBeVisible()
  // Đáp án đúng tô xanh; mỗi câu có đúng một chữ ẩn "(đáp án đúng)" cho trình đọc màn hình.
  await expect(page.getByText('(đáp án đúng)')).toHaveCount(await questions.count())
  await expect(page.getByRole('radio')).toHaveCount(0)

  // Mở lại đúng đường dẫn (tải lại trang, link chia sẻ) vẫn ra bài học.
  await page.reload()
  await expect(questions.first()).toBeVisible()
})

test('thi thử: làm vài câu, nộp, xem lại, rồi thấy trong "Lượt làm gần đây"', async ({ page }) => {
  await openFirstSubject(page)
  const subjectName = await page.getByRole('heading', { level: 1 }).textContent()
  await page.getByRole('button', { name: 'Bắt đầu thi thử' }).click()

  await expect(page.getByRole('timer')).toContainText('Còn lại')
  await page.getByRole('radio').first().check()
  await expect(page.getByText('Đã trả lời 1/')).toBeVisible()
  await page.getByRole('button', { name: 'Câu sau →' }).click()
  await page.getByRole('radio').first().check()
  await expect(page.getByText('Đã trả lời 2/')).toBeVisible()
  // Chưa nộp thì không có đúng / sai.
  await expect(page.getByRole('status')).toHaveCount(0)

  await page.getByRole('button', { name: 'Nộp bài' }).click()
  const confirm = page.getByRole('region', { name: 'Nộp bài?' })
  await expect(confirm).toContainText('chưa trả lời')
  await confirm.getByRole('button', { name: 'Nộp bài' }).click()

  const result = page.getByRole('region', { name: 'Kết quả' })
  await expect(result).toContainText('/ 10 điểm')
  await expect(result).toContainText(/Đúng \d+\/\d+ câu · Sai \d+ · Bỏ trống \d+/)
  await expect(page.getByRole('timer')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText(/Chính xác|Chưa đúng|bỏ trống/)

  await page.getByRole('link', { name: 'Quiz Study' }).click()
  const recent = page.getByRole('region', { name: 'Lượt làm gần đây' })
  await expect(recent).toContainText(`Thi thử: ${subjectName}`)
  await expect(recent).toContainText('điểm')
})

test('mở môn không tồn tại thì báo không tìm thấy', async ({ page }) => {
  await page.goto('/subjects/khong-co-mon-nay')

  await expect(page.getByRole('heading', { name: 'Không tìm thấy môn học' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Về trang chủ' })).toBeVisible()
})
