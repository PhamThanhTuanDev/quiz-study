# Skill & workflow cho Claude Code (ECC)

> Nguồn: [affaan-m/ECC](https://github.com/affaan-m/ECC), phiên bản **2.2.2**, commit `c70874f` (2026-09-29).
> Phạm vi cài: **chỉ project này** (`quiz-study/.claude/`). Không cài gì vào `~/.claude` (toàn máy).
> Đã cài: **21 skill + 10 agent**. **Không** cài hooks, rules, commands, MCP của ECC.

## 1. Tại sao cài chọn lọc, và cài bằng cách nào

ECC có 293 skill, 68 agent, 94 command, cùng hooks, rules, MCP. README của ECC đưa ra hai đường cài:

| Cách | Kết quả | Lý do không dùng / có dùng |
|---|---|---|
| Plugin `ecc@ecc` (`npx ecc-universal setup` hoặc `/plugin install ecc@ecc`) | Cài **toàn bộ** skill, agent, command và hooks, không chọn lọc được | Trái yêu cầu "không cài hàng trăm skill tùy tiện". Ngoài ra cần lệnh `claude` trên PATH, mà máy này chỉ có Claude Code dạng VS Code extension |
| Installer chọn lọc `install.ps1 --target claude-project --skills ...` | Chỉ cài đúng các skill được nêu, vào `./.claude/skills/` của project | **Đã thử, bị lỗi trên ổ Google Drive** (xem mục 2) |
| Copy thủ công từng thành phần (README ECC: *"Manual component-by-component copying also works. Each component is fully independent"*) | Giống cách trên | **Đã dùng** |

Một số skill (`coding-standards`, `tdd-workflow`, `verification-loop`, `security-review`) thuộc các module lớn của installer. Khi chọn chúng, installer kéo theo 631 file (rule của mọi ngôn ngữ, cả 68 agent, mọi command). Vì vậy 4 skill này luôn phải copy riêng. Agent cũng vậy: installer chỉ cài agent theo cả gói 68, nên 10 agent cần thiết được copy riêng từng file.

## 2. Sự cố khi cài và cách xử lý

- **Lỗi:** `Error: EISDIR: illegal operation on a directory, link '...\.claude\settings.json.ecc.lock.create-...'`
- **Nguyên nhân gốc:** installer tạo file khoá (lock) bằng *hard link*, nhưng ổ `G:\My Drive` (Google Drive for desktop) **không hỗ trợ hard link**. Installer dừng trước khi ghi file nào, nên project không bị ghi dở.
- **Kiểm chứng:** chạy cùng lệnh vào một thư mục tạm trên ổ `C:` thì cài thành công (17 thao tác), và 17 thư mục skill được cài **giống hệt byte-by-byte** với thư mục nguồn trong repo ECC.
- **Cách xử lý:** copy trực tiếp các thư mục skill/agent từ repo ECC (đúng commit trên) vào `.claude/`, kết quả tương đương installer. Hai thứ installer tạo thêm **không** được mang sang:
  - `.claude/settings.json` chứa `"includeCoAuthoredBy": false` (tắt dòng ghi công trong commit). Đây là tuỳ chọn cá nhân, không liên quan yêu cầu.
  - `.claude/ecc/install-state.json` chứa đường dẫn tuyệt đối của thư mục tạm, sẽ gây hiểu nhầm.
- **Hệ quả:** các lệnh `ecc doctor` / `ecc uninstall` không quản lý bản cài này. Gỡ bằng cách xoá thư mục tương ứng (mục 8).

> Ghi chú: lỗi này cũng là dấu hiệu cho thấy đặt project trong Google Drive sẽ gặp vấn đề với công cụ phát triển (`node_modules`, `target/`, `.git`). Xem mục "Cần quyết định" trong [decisions.md](decisions.md).

## 3. Đối chiếu 17 nhóm yêu cầu

| # | Nhóm yêu cầu | Đã cài | Ghi chú |
|---|---|---|---|
| 1 | Planning / architecture | agent `planner`, agent `architect`, skill `architecture-decision-records`, skill `api-design` | |
| 2 | Search-first / research | skill `search-first` | `deep-research`, `documentation-lookup` cần MCP chưa có (mục 6) |
| 3 | React | skill `react-patterns` | |
| 4 | TypeScript | agent `typescript-reviewer`, skill `coding-standards` | ECC không có skill riêng cho TypeScript; quy ước TS nằm ở `.claude/rules/frontend.md` |
| 5 | Frontend design / responsive UI | skill `frontend-design-direction`, skill `frontend-a11y`, skill `vite-patterns` | |
| 6 | Java | skill `java-coding-standards`, agent `java-reviewer` | |
| 7 | Spring Boot | skill `springboot-patterns`, skill `springboot-verification` | |
| 8 | Spring Security | skill `springboot-security` | |
| 9 | JPA / Hibernate | skill `jpa-patterns` | |
| 10 | MySQL / database design | skill `mysql-patterns` | |
| 11 | Testing / TDD | skill `tdd-workflow`, skill `springboot-tdd`, skill `react-testing`, agent `tdd-guide` | |
| 12 | E2E testing | skill `e2e-testing` (Playwright) | Agent `e2e-runner` không cài (mục 6) |
| 13 | Code review | agent `code-reviewer`, agent `java-reviewer`, agent `typescript-reviewer` | Claude Code cũng có sẵn lệnh `/code-review` |
| 14 | Build fixing | agent `build-error-resolver` (TypeScript/Vite), agent `java-build-resolver` (Maven), skill `verification-loop` | |
| 15 | Security review | skill `security-review`, agent `security-reviewer` | Claude Code cũng có sẵn `/security-review` |
| 16 | Git / GitHub | skill `git-workflow` | `github-ops` cần `gh` CLI (chưa cài) |
| 17 | Refactoring / clean code | skill `coding-standards`, agent `code-simplifier` | Claude Code cũng có sẵn `/simplify` |

## 4. Skill đã cài (21), trong `.claude/skills/`

Skill chỉ được nạp khi cần: lúc bình thường Claude chỉ thấy tên và mô tả ngắn, nên không tốn nhiều context.

| Skill | Dùng khi |
|---|---|
| `search-first` | Trước khi viết code mới: tìm thư viện/giải pháp có sẵn |
| `architecture-decision-records` | Ghi lại quyết định kiến trúc |
| `api-design` | Thiết kế/review REST endpoint, status code, phân trang, lỗi |
| `coding-standards` | Quy ước đặt tên, dễ đọc, chất lượng code (chung) |
| `java-coding-standards` | Quy ước Java cho Spring Boot |
| `springboot-patterns` | Kiến trúc Controller/Service/Repository, REST, data access |
| `springboot-security` | Spring Security: authn/authz, validation, CSRF, secrets |
| `springboot-tdd` | TDD với JUnit 5, Mockito, MockMvc |
| `springboot-verification` | Vòng kiểm tra backend: build, test, coverage, scan |
| `jpa-patterns` | Thiết kế entity, quan hệ, query, transaction, phân trang |
| `mysql-patterns` | Schema, index, transaction MySQL |
| `react-patterns` | Hooks, component, state, data fetching trong React |
| `react-testing` | Test component với React Testing Library + Vitest |
| `vite-patterns` | Cấu hình Vite, proxy, biến môi trường, build |
| `frontend-design-direction` | Định hướng thiết kế giao diện |
| `frontend-a11y` | Accessibility: HTML ngữ nghĩa, bàn phím, form |
| `tdd-workflow` | Quy trình viết test trước (red → green → refactor) |
| `e2e-testing` | Test E2E bằng Playwright |
| `verification-loop` | Kiểm tra tổng thể trước khi báo xong: build, type, lint, test, diff |
| `security-review` | Checklist bảo mật khi làm auth, input, API, secrets |
| `git-workflow` | Branch, commit message, merge/rebase |

## 5. Agent đã cài (10), trong `.claude/agents/`

| Agent | Vai trò | Model (theo ECC) |
|---|---|---|
| `planner` | Lập kế hoạch triển khai feature | opus |
| `architect` | Thiết kế hệ thống, quyết định kiến trúc | opus |
| `code-reviewer` | Review chất lượng, bảo mật, dễ bảo trì | sonnet |
| `java-reviewer` | Review Java / Spring Boot / JPA | sonnet |
| `typescript-reviewer` | Review TypeScript / React | sonnet |
| `build-error-resolver` | Sửa lỗi build/type phía frontend với thay đổi nhỏ nhất | sonnet |
| `java-build-resolver` | Sửa lỗi build Maven/Java | sonnet |
| `security-reviewer` | Tìm lỗ hổng bảo mật | sonnet |
| `tdd-guide` | Hướng dẫn viết test trước | sonnet |
| `code-simplifier` | Làm gọn code, giữ nguyên hành vi | sonnet |

> Mô tả của một số agent có chữ "Use PROACTIVELY / MUST BE USED", nên Claude có thể tự gọi agent. `.claude/CLAUDE.md` của project quy định chỉ dùng agent khi thật sự cần (feature lớn, trước khi báo hoàn thành, hoặc khi bạn yêu cầu), để tránh tốn chi phí và thời gian.

Tham chiếu còn sót trong file đã cài, **không ảnh hưởng**: `java-reviewer` và `java-build-resolver` nhắc tới skill `quarkus-patterns` (dự án không dùng Quarkus); `coding-standards` nhắc tới `rules/common/coding-style.md` (không cài, xem mục 6).

## 6. Không cài, và lý do

| Thành phần | Lý do |
|---|---|
| Plugin `ecc@ecc` (toàn bộ) | Cài tất cả 293 skill / 68 agent / hooks; không chọn lọc được |
| **Hooks runtime** | Script tự chạy sau mỗi lần sửa file hoặc kết thúc phiên. ECC yêu cầu đồng ý rõ ràng. Người mới dễ bối rối khi có script chạy ngầm; có thể bật sau |
| **Rules ECC** (`rules/common`, `rules/java`, `rules/typescript`, `rules/react`…) | `rules/common` luôn được nạp và mâu thuẫn với nguyên tắc dự án: tự gọi agent không cần hỏi, bắt buộc TDD + 80% coverage cho mọi loại test, bắt buộc `gh search` trước khi code, sinh PRD/system_design cho mỗi feature, tham chiếu agent `ecc:*` chỉ có khi cài plugin. Rule theo ngôn ngữ phần lớn trùng nội dung với các skill đã cài. Thay vào đó dự án dùng rule riêng ngắn gọn trong `.claude/rules/` |
| Commands (`/tdd`, `/plan`…) | ECC đang chuyển sang skill; command chỉ là lớp tương thích cũ |
| MCP servers | Không cần ở giai đoạn này |
| `documentation-lookup` | Cần MCP **Context7** (chưa cấu hình) |
| `deep-research` | Cần MCP **firecrawl / exa** (chưa cấu hình) |
| `frontend-patterns` | Thiên về Next.js; trùng `react-patterns` |
| `react-performance` | Tối ưu theo React/Next.js của Vercel; chưa cần ở giai đoạn đầu |
| `backend-patterns` | Dành cho Node.js / Express / Next.js API |
| `database-migrations` | Tập trung PostgreSQL / Prisma / Drizzle / Django; chờ quyết định Flyway |
| `design-system` | Trích xuất design token từ codebase có sẵn; hiện chưa có code |
| `accessibility` | Trùng `frontend-a11y` và rộng cả iOS/Android |
| `docker-patterns` | Máy chưa cài Docker |
| `github-ops` | Cần `gh` CLI (chưa cài); chưa có remote GitHub |
| `browser-qa` | Cần MCP điều khiển trình duyệt |
| `plankton-code-quality` | Hoạt động qua hooks |
| `blueprint`, `plan-orchestrate`, `plan-canvas`, `orch-*` | Điều phối đa agent / đa phiên; quá nặng cho dự án hiện tại |
| `security-scan` | Quét cấu hình `.claude/` bằng AgentShield; có thể thêm sau |
| Agent `e2e-runner` | Ưu tiên cài công cụ global `agent-browser` (`npm install -g`); skill `e2e-testing` đã đủ |
| Agent `refactor-cleaner` | Chạy `knip`/`depcheck`/`ts-prune` qua npx; hữu ích khi codebase lớn, thêm sau |
| Agent `react-reviewer`, `react-build-resolver` | Trùng `typescript-reviewer` + `react-patterns` và `build-error-resolver` |
| Agent `database-reviewer` | Chuyên PostgreSQL |
| Agent `doc-updater` | Sinh codemap; chưa cần |
| Skill cho Python, Django, FastAPI… | Python ở đây là **môn học**, không phải ngôn ngữ của hệ thống |

## 7. Đã kiểm tra

- 21 thư mục trong `.claude/skills/`, mỗi thư mục có `SKILL.md` với `name:` trùng tên thư mục.
- 10 file trong `.claude/agents/`, `name:` khớp tên file.
- So sánh (`diff -r`) từng skill và agent với repo ECC tại commit `c70874f`: **giống hệt**.
- Installer chính thức (chạy thử trên ổ C:) chọn đúng 17 skill, không kéo theo module khác.
- **Kiểm tra lúc chạy (bạn tự làm):** Claude Code chỉ nhận skill/agent mới khi mở phiên mới. Hãy mở cửa sổ Claude Code mới trong thư mục `quiz-study`, gõ `/` để xem skill, và `/agents` để xem agent.

## 8. Cập nhật / gỡ bỏ

- **Cập nhật:** clone ECC ở tag/commit mới, xem thay đổi, copy lại đúng các thư mục trong danh sách trên, rồi cập nhật commit ở đầu file này.
- **Gỡ một skill:** xoá `.claude/skills/<tên-skill>/`. **Gỡ agent:** xoá `.claude/agents/<tên>.md`.
- **Thêm skill:** copy `skills/<tên>/` từ repo ECC vào `.claude/skills/` và ghi vào file này kèm lý do.
