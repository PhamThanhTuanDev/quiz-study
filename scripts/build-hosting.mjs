// Đóng gói Quiz Study để tải lên hosting cPanel (D-054): frontend đã build + backend PHP → build/quiz-study-hosting.zip
//
// Chạy từ thư mục gốc project:  node scripts/build-hosting.mjs
// Cần: Node (như khi build frontend). Windows 10+ dùng tar.exe có sẵn để nén zip; Linux/macOS dùng lệnh zip.
//
// File zip KHÔNG chứa api/config.php (mật khẩu database): lần đầu tạo trên hosting từ api/config.example.php;
// những lần cập nhật sau giải nén đè lên vẫn giữ nguyên config.php đã có.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = join(root, 'frontend')
const outDir = join(root, 'build', 'hosting')
const zipFile = join(root, 'build', 'quiz-study-hosting.zip')
const isWindows = process.platform === 'win32'

function run(command, args, cwd) {
  // Windows: npm là npm.cmd, phải chạy qua shell.
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: isWindows })
}

console.log('1/3 Build frontend…')
run('npm', ['run', 'build'], frontend)

console.log('2/3 Gom file vào build/hosting…')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(join(frontend, 'dist'), outDir, { recursive: true })
cpSync(join(root, 'backend-php', 'public'), outDir, {
  recursive: true,
  // config.php trên máy có thể chứa mật khẩu thật: không đưa vào gói.
  filter: (source) => !source.endsWith(join('api', 'config.php')),
})
if (existsSync(join(outDir, 'api', 'config.php'))) throw new Error('Gói không được chứa api/config.php')

console.log('3/3 Nén zip…')
rmSync(zipFile, { force: true })
const entries = readdirSync(outDir) // gồm cả .htaccess
if (isWindows) {
  run('tar.exe', ['-a', '-c', '-f', zipFile, ...entries], outDir)
} else {
  run('zip', ['-r', '-q', zipFile, ...entries], outDir)
}
console.log(`Xong: ${zipFile}`)
