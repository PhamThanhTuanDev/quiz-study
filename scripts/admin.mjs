#!/usr/bin/env node
/**
 * Công cụ quản trị (D-056): chạy migration database và import môn, qua API quản trị của backend PHP.
 *
 *   node scripts/admin.mjs migrate                       # chạy các migration chưa chạy (api/migrations/V*.sql)
 *   node scripts/admin.mjs import <slug> [--replace]     # gửi database/seed/<slug>/generated/import.json
 *
 * Gửi tới đâu, bằng mã nào: biến môi trường hoặc file .env ở thư mục gốc project
 *   QUIZ_ADMIN_URL    địa chỉ server; để trống = server trên máy (http://127.0.0.1:8080, backend-php/dev-router.php)
 *   QUIZ_ADMIN_TOKEN  mã quản trị của server đó (admin_token trong api/config.php); để trống = ADMIN_TOKEN
 *
 * Server kiểm tra toàn bộ file trước khi ghi; có lỗi thì không ghi gì và trả về danh sách lỗi.
 * Môn đã có: thêm --replace để thay bài và câu hỏi của môn (câu đã có người làm được giữ lại ở dạng lưu trữ).
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const USAGE = `Cách dùng:
  node scripts/admin.mjs migrate
  node scripts/admin.mjs import <slug> [--replace]`

class AdminError extends Error {}

function loadSettings() {
  const envFile = path.join(ROOT, '.env')
  // Không ghi đè biến môi trường đã đặt, nên đặt QUIZ_ADMIN_URL trong cửa sổ lệnh là đổi được server cho một lần chạy.
  if (existsSync(envFile)) process.loadEnvFile(envFile)
  const url = (process.env.QUIZ_ADMIN_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '')
  const token = process.env.QUIZ_ADMIN_TOKEN || process.env.ADMIN_TOKEN || ''
  if (token === '') {
    throw new AdminError('Chưa có mã quản trị: đặt QUIZ_ADMIN_TOKEN (hoặc ADMIN_TOKEN) trong file .env.')
  }
  return { url, token }
}

async function callAdmin(settings, route, body) {
  const endpoint = `${settings.url}/api/v1/admin/${route}`
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.token}`, 'Content-Type': 'application/json' },
      body,
    })
  } catch (error) {
    const local = /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(settings.url)
    const hint = local ? '\nServer trên máy đã bật chưa? php -S 127.0.0.1:8080 backend-php/dev-router.php' : ''
    throw new AdminError(`Không kết nối được tới ${settings.url}: ${error.cause?.message ?? error.message}${hint}`)
  }
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new AdminError(`${endpoint} trả về HTTP ${response.status}, không phải JSON:\n${text.slice(0, 500)}`)
  }
  if (!response.ok) throw new AdminError(describeProblem(response.status, data))
  return data
}

function describeProblem(status, problem) {
  if (status === 404) {
    return 'Server không có API quản trị (HTTP 404): kiểm tra QUIZ_ADMIN_URL, và admin_token (≥ 24 ký tự) trong api/config.php của server.'
  }
  if (status === 401) return 'Sai mã quản trị (HTTP 401): QUIZ_ADMIN_TOKEN phải giống admin_token của server.'
  const lines = [`HTTP ${status}: ${problem.detail ?? 'lỗi không rõ'}`]
  for (const item of problem.problems ?? []) lines.push(`  - ${item}`)
  return lines.join('\n')
}

async function migrate(settings) {
  const result = await callAdmin(settings, 'migrate')
  if (result.applied.length === 0) {
    console.log(`Database đã mới nhất (${result.alreadyApplied} migration đã chạy từ trước).`)
    return
  }
  console.log(`Đã chạy ${result.applied.length} migration:`)
  for (const script of result.applied) console.log(`  ${script}`)
}

async function importSubject(settings, slug, replace) {
  const file = path.join(ROOT, 'database', 'seed', slug, 'generated', 'import.json')
  if (!existsSync(file)) {
    throw new AdminError(`Chưa có file ${file}. Hãy chạy script dựng dữ liệu của môn này trước (xem scripts/README.md).`)
  }
  const result = await callAdmin(settings, `import${replace ? '?replace=true' : ''}`, readFileSync(file, 'utf8'))
  console.log(`${result.updatedExisting ? 'Đã thay nội dung môn' : 'Đã thêm môn'} "${result.slug}" trên ${settings.url}:`)
  console.log(`  ${result.chapterCount} bài, ${result.questionCount} câu (${result.publishedCount} câu dùng được)`)
  if (result.updatedExisting) {
    console.log(`  câu cũ: ${result.archivedCount} lưu trữ (đã có người làm), ${result.removedCount} xoá; ảnh không còn dùng: ${result.removedMediaCount} xoá`)
  }
}

async function main(args) {
  const [command, ...rest] = args
  if (command === 'migrate' && rest.length === 0) return migrate(loadSettings())
  if (command === 'import') {
    const flags = rest.filter((arg) => arg.startsWith('--'))
    const names = rest.filter((arg) => !arg.startsWith('--'))
    const unknown = flags.filter((flag) => flag !== '--replace')
    if (names.length === 1 && SLUG_PATTERN.test(names[0]) && unknown.length === 0) {
      return importSubject(loadSettings(), names[0], flags.includes('--replace'))
    }
  }
  throw new AdminError(USAGE)
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  if (!(error instanceof AdminError)) throw error
  console.error(error.message)
  process.exitCode = 1
}
