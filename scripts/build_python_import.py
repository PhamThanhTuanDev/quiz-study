"""Dựng file import môn Python từ PDF + bản đồ vị trí (D-035).

Bản đồ vị trí: database/seed/python/questions/bai-NN.json (commit). Mỗi câu ghi *vị trí* dòng của đề,
code, phương án trên slide (mã dòng do extract_python_pages.py đánh số), cùng đáp án, lý do và cách
kiểm chứng. Nội dung được lấy lại từ PDF theo vị trí, không gõ lại, nên luôn đúng nguyên văn.

Tự kiểm tra và dừng (mã lỗi 1) nếu: mã dòng sai, một dòng dùng hai lần, còn dòng chưa được xử lý trên
trang trắc nghiệm, câu PUBLISHED thiếu đáp án / lý do / kiểm chứng, câu điền khuyết sai số chỗ trống…

Chạy từ thư mục gốc project:
    scripts\\.venv\\Scripts\\python scripts\\build_python_import.py [--allow-incomplete]
--allow-incomplete: chỉ dựng các bài đã có bản đồ (dùng khi đang làm dở), không ghi import.json.

Kết quả (không commit, D-030): database/seed/python/generated/import.json và review.md.
"""

from __future__ import annotations

import json
import re
import statistics
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path

import pymupdf

from python_source import GENERATED_DIR, SEED_DIR, PageLine, load_config, page_lines, quiz_page_numbers, source_path

MAPS_DIR = SEED_DIR / "questions"
LETTERS = "ABCDEFGH"
BLANK = "…"
# Chỗ trống trên slide viết bằng "…" hoặc ba dấu chấm "..." (w04.1 LT trang 20, 28).
BLANK_RE = re.compile(r"…|\.\.\.")
STEM_NUMBER_RE = re.compile(r"^\s*(\d+)\s*\.\s*")
# Mục liệt kê trong đề ("1) …", "2) …"): giữ mỗi mục trên một dòng thay vì nối vào đoạn văn.
STEM_ITEM_RE = re.compile(r"^\s*\d+\)\s")
OPTION_LABEL_RE = re.compile(r"(?:^|(?<=\s))([A-H])\.\s*")
LINE_REF_RE = re.compile(r"^(?:p(\d+):)?([LR])(\d+)(?:-([LR])(\d+))?$")
SAME_ROW_TOLERANCE = 3.0  # hai khung chữ lệch nhau dưới 3pt theo chiều dọc coi là cùng một hàng
INDENT_TOLERANCE = 5.0

# Phương án phụ thuộc vị trí: xáo trộn sẽ làm sai nghĩa (D-034 giữ quy tắc của GDQP).
POSITION_DEPENDENT_RE = re.compile(r"tất cả|cả\s+(3|ba|2|hai|4|bốn)\b|(đáp án|phương án|ý)\s+trên", re.IGNORECASE)


# Nhóm câu cần duyệt trong review.md, để chủ dự án có thể quyết cả nhóm một lần.
REVIEW_GROUPS = {
    "open": "Câu hỏi mở không có phương án A–D trong tài liệu (chỉ có bài làm của chủ dự án). Claude tạo 4 phương án "
            "theo cách làm của câu điền khuyết (D-026); đáp án đã chạy kiểm chứng. Cần chủ dự án đồng ý mở rộng D-026",
    "typography": "Code không chạy được nguyên văn vì ký tự in ấn (PowerPoint đổi \"-\" thành \"–\", nháy thẳng "
                  "thành nháy cong, lệnh không thụt lề do nhãn phương án chiếm chỗ). Đáp án đề xuất đã chạy kiểm chứng "
                  "sau khi sửa ký tự",
}


class MapError(Exception):
    """Lỗi trong bản đồ vị trí; gom lại để báo một lần."""


@dataclass
class Question:
    ref: str
    chapter: int
    source: dict
    page: int
    number: int
    label: str
    content: str
    code: str | None
    options: list[str]
    answer: int | None
    status: str
    review_note: str | None
    kind: str  # "choice" | "fill"
    fill_values: list[list[str]] | None
    reason: str
    verify: dict | None
    duplicate_of: str | None
    review_group: str | None = None
    shuffle: bool = True
    used_lines: list[tuple[int, str]] = field(default_factory=list)


# ---------------------------------------------------------------- Văn bản


def normalize(text: str) -> str:
    return " ".join(text.split())


def join_lines(parts: list[str]) -> str:
    """Nối các dòng bị ngắt do layout: như extract_gdqp.join_lines (gạch nối dính chữ thì nối liền)."""
    text = ""
    for part in parts:
        if text and not text[-1].isspace() and not (len(text) > 1 and text.endswith("-") and not text[-2].isspace()):
            text += " "
        text += part
    return normalize(text)


# ---------------------------------------------------------------- Đọc trang và mã dòng


class Pages:
    """Đọc và nhớ các dòng của từng trang, theo khoá nguồn."""

    def __init__(self, sources: dict[str, dict]):
        self.sources = sources
        self.docs: dict[str, pymupdf.Document] = {}
        self.cache: dict[tuple[str, int], dict[str, PageLine]] = {}

    def lines(self, key: str, page: int) -> dict[str, PageLine]:
        if (key, page) not in self.cache:
            if key not in self.docs:
                self.docs[key] = pymupdf.open(source_path(self.sources[key]))
            self.cache[(key, page)] = {line.id: line for line in page_lines(self.docs[key][page - 1])}
        return self.cache[(key, page)]

    def quiz_pages(self, key: str) -> list[int]:
        if key not in self.docs:
            self.docs[key] = pymupdf.open(source_path(self.sources[key]))
        return quiz_page_numbers(self.docs[key])


def resolve(pages: Pages, key: str, default_page: int, refs: list[str] | None) -> list[tuple[int, PageLine]]:
    """ "L01", "L01-L05", "p4:R02-R06" → danh sách (trang, dòng) theo đúng thứ tự ghi."""
    result: list[tuple[int, PageLine]] = []
    for ref in refs or []:
        match = LINE_REF_RE.match(ref)
        if not match:
            raise MapError(f"mã dòng '{ref}' sai dạng (ví dụ đúng: L01, L01-L05, p4:R02-R06)")
        page = int(match.group(1) or default_page)
        column, start = match.group(2), int(match.group(3))
        end_column, end = match.group(4) or column, int(match.group(5) or start)
        if end_column != column or end < start:
            raise MapError(f"khoảng dòng '{ref}' phải cùng cột và tăng dần")
        lines = pages.lines(key, page)
        for index in range(start, end + 1):
            line_id = f"{column}{index:02d}"
            if line_id not in lines:
                raise MapError(f"trang {page} không có dòng {line_id}")
            result.append((page, lines[line_id]))
    return result


def insert_spaces(lines: list[tuple[int, PageLine]], fixes: dict[str, str]) -> list[tuple[int, PageLine]]:
    """ "spaceBefore": {"R12": "D. Đáp án khác"} chèn một dấu cách trước chuỗi đó trong dòng R12.

    Dùng khi hai phần dính liền trên slide (ví dụ "__name__D. Đáp án khác") làm không tách được nhãn phương án.
    Chỉ thêm khoảng trắng nên nội dung chữ không đổi.
    """
    result = []
    for page, line in lines:
        target = fixes.get(line.id)
        if target is not None:
            if line.text.count(target) != 1:
                raise MapError(f"spaceBefore: '{target}' phải xuất hiện đúng 1 lần trong dòng {line.id}")
            line = replace(line, text=line.text.replace(target, " " + target))
        result.append((page, line))
    return result


# ---------------------------------------------------------------- Dựng đề, code, phương án


def build_stem(lines: list[tuple[int, PageLine]]) -> tuple[int, str]:
    if not lines:
        raise MapError("thiếu dòng đề (stem)")
    first = lines[0][1].text
    match = STEM_NUMBER_RE.match(first)
    if not match:
        raise MapError(f"dòng đầu của đề phải bắt đầu bằng số thứ tự câu: '{first.strip()}'")
    paragraphs: list[list[str]] = [[first[match.end():]]]
    for _, line in lines[1:]:
        if STEM_ITEM_RE.match(line.text):
            paragraphs.append([])
        paragraphs[-1].append(line.text)
    return int(match.group(1)), "\n".join(join_lines(parts) for parts in paragraphs)


def build_code(lines: list[tuple[int, PageLine]], soft_wraps: set[str]) -> str | None:
    """Ghép các dòng code, giữ thụt lề tính từ toạ độ (font code rộng đều) và ghép khung chữ cùng hàng.

    soft_wraps: mã các dòng bị slide tự ngắt vì quá dài; hàng sau được nối lại vào dòng đó bằng một dấu cách.
    """
    if not lines:
        return None
    widths = [line.char_width for _, line in lines if line.char_width]
    char_width = statistics.median(widths) if widths else None
    rows = group_rows(lines)
    base_x = min(row[0].x for row in rows)
    out = []
    continues = False
    for row in rows:
        if continues:
            out[-1] = out[-1].rstrip() + " " + " ".join(segment.text.strip() for segment in row)
            continues = any(line.id in soft_wraps for line in row)
            continue
        continues = any(line.id in soft_wraps for line in row)
        text = indent_of(row[0], base_x, char_width) + row[0].text.strip()
        for segment in row[1:]:
            # Đặt khung chữ theo cột tính từ toạ độ x, không theo khoảng trống với khung trước: khung trước
            # có thể kèm dấu cách cuối (ví dụ "(3) " so với "(5)"), làm các dòng thẳng hàng bị lệch 1 cột.
            column = len(indent_of(segment, base_x, char_width))
            text += " " * max(1, column - len(text)) + segment.text.strip()
        out.append(text.rstrip())
    if continues:
        raise MapError("softWrap ở hàng code cuối cùng: không có dòng tiếp theo để nối")
    return "\n".join(out)


def group_rows(lines: list[tuple[int, PageLine]]) -> list[list[PageLine]]:
    ordered = sorted(lines, key=lambda item: (item[0], item[1].y, item[1].x))
    rows: list[list[PageLine]] = []
    last_key = None
    for page, line in ordered:
        if rows and last_key and last_key[0] == page and abs(last_key[1] - line.y) < SAME_ROW_TOLERANCE:
            rows[-1].append(line)
        else:
            rows.append([line])
            last_key = (page, line.y)
    return [sorted(row, key=lambda line: line.x) for row in rows]


def indent_of(line: PageLine, base_x: float, char_width: float | None) -> str:
    leading = len(line.text) - len(line.text.lstrip())
    if not char_width:
        return " " * leading
    return " " * (max(0, round((line.x - base_x) / char_width)) + leading)


@dataclass
class OptionDraft:
    letter: str
    x: float
    lines: list[str]


def build_options(lines: list[tuple[int, PageLine]]) -> list[str]:
    """Tách phương án theo nhãn "A." "B."…; dòng không có nhãn nối vào phương án gần nhất phía trên.

    Phương án xếp dạng lưới (A, B bên trái; C, D bên phải) vẫn đúng vì sắp lại theo chữ cái của nhãn.
    Hai phương án cùng nhãn (P8) giữ theo thứ tự xuất hiện; nhãn được tính lại khi hiển thị.
    """
    drafts: list[OptionDraft] = []
    row: list[OptionDraft] = []
    row_y: float | None = None
    for _, line in lines:
        labels = list(OPTION_LABEL_RE.finditer(line.text))
        if labels and labels[0].start() == len(line.text) - len(line.text.lstrip()):
            if row_y is None or abs(line.y - row_y) >= SAME_ROW_TOLERANCE:
                row, row_y = [], line.y
            for label, next_label in zip(labels, labels[1:] + [None]):
                end = next_label.start() if next_label else len(line.text)
                ratio = label.start() / max(1, len(line.text))
                draft = OptionDraft(label.group(1), line.x + ratio * (line.x_end - line.x),
                                    [line.text[label.end():end].strip()])
                drafts.append(draft)
                row.append(draft)
        elif row:
            owner = max((d for d in row if d.x <= line.x + INDENT_TOLERANCE), key=lambda d: d.x, default=row[0])
            if row_y is not None and abs(line.y - row_y) < SAME_ROW_TOLERANCE:
                owner.lines.append(line.text)  # nhãn "A." và nội dung là hai khung chữ trên cùng một hàng
            elif line.is_code or line.x - owner.x > INDENT_TOLERANCE:
                indent = "" if abs(line.x - owner.x) <= INDENT_TOLERANCE else "    "
                owner.lines.append("\n" + indent + line.text.strip())
            else:
                owner.lines.append(line.text)
        else:
            raise MapError(f"dòng phương án '{line.text.strip()}' không có nhãn và không có phương án phía trên")

    drafts.sort(key=lambda d: LETTERS.index(d.letter))  # sort ổn định: nhãn trùng giữ thứ tự xuất hiện
    return [option_text(d.lines) for d in drafts]


def option_text(parts: list[str]) -> str:
    """Dòng tách bằng "\\n" là cấu trúc (code, khối lồng nhau) nên giữ; dòng khác là chữ bị ngắt nên nối lại."""
    blocks: list[list[str]] = [[]]
    for part in parts:
        if part.startswith("\n"):
            blocks.append([part[1:]])
        else:
            blocks[-1].append(part)
    first = join_lines(blocks[0])
    rest = [block[0].rstrip() if len(block) == 1 else join_lines(block) for block in blocks[1:]]
    return "\n".join([first] + rest)


def fill_option_text(values: list[str]) -> str:
    return " ".join(f"[{value}]" for value in values)


# ---------------------------------------------------------------- Bản đồ → câu hỏi


def build_question(pages: Pages, sources: dict[str, dict], chapter: int, entry: dict) -> Question:
    ref = entry.get("ref", "")
    parts = ref.split("/")
    if len(parts) != 3 or parts[0] not in sources:
        raise MapError(f"ref '{ref}' phải có dạng <nguồn>/<trang>/<số câu>, nguồn có trong subject.json")
    key, page = parts[0], int(parts[1])
    source = sources[key]

    fixes = entry.get("spaceBefore", {})
    stem_lines, code_lines, option_lines, owner_lines = (
        insert_spaces(resolve(pages, key, page, entry.get(part)), fixes)
        for part in ("stem", "code", "options", "ownerAnswer")
    )
    unknown = set(fixes) - {line.id for _, line in stem_lines + code_lines + option_lines + owner_lines}
    if unknown:
        raise MapError(f"spaceBefore có dòng không thuộc câu này: {', '.join(sorted(unknown))}")
    number, content = build_stem(stem_lines)
    if parts[2].split("-")[0] != str(number):
        raise MapError(f"ref '{ref}' ghi số câu {parts[2]} nhưng đề là câu {number}")

    # "fill": câu điền khuyết, Claude tạo bộ giá trị cho chỗ trống (D-026).
    # "choices": câu hỏi mở không có phương án, Claude tạo phương án theo cùng cách làm.
    kind = "fill" if "fill" in entry else "open" if "choices" in entry else "choice"
    fill_values = entry.get("fill")
    soft_wraps = set(entry.get("softWrap", []))
    if not soft_wraps <= {line.id for _, line in code_lines}:
        raise MapError("softWrap phải là dòng code của chính câu này")
    code = build_code(code_lines, soft_wraps)
    if fill_values:
        options = [fill_option_text(v) for v in fill_values]
    elif kind == "open":
        options = list(entry["choices"])
    else:
        options = build_options(option_lines)

    occurrence = parts[2].split("-")[1] if "-" in parts[2] else None
    # Có trang lý thuyết đánh số lại từ 1 cho mỗi phần (w04.1 LT: tuple, set, dictionary), nên ghi cả số trang.
    label = f"{source['label']} tr.{page} – Câu {number}" + (f" (lần {occurrence})" if occurrence else "")
    if kind == "fill":
        label += " (gốc: điền khuyết)"
    elif kind == "open":
        label += " (gốc: câu hỏi mở)"

    answer = entry.get("answer")
    question = Question(
        ref=ref, chapter=chapter, source=source, page=page, number=number, label=label, content=content,
        code=code, options=options, answer=LETTERS.index(answer) if answer else None,
        status=entry.get("status", "PUBLISHED"), review_note=entry.get("reviewNote"), kind=kind,
        fill_values=fill_values, reason=entry.get("reason", ""), verify=entry.get("verify"),
        duplicate_of=entry.get("duplicateOf"), review_group=entry.get("reviewGroup"),
        used_lines=[(p, line.id) for p, line in stem_lines + code_lines + option_lines + owner_lines],
    )
    question.shuffle = not any(POSITION_DEPENDENT_RE.search(option) for option in options)
    check_question(question)
    return question


def check_question(q: Question) -> None:
    if q.duplicate_of:
        return  # câu trùng không được import; chỉ cần phủ dòng
    if len(q.options) < 2:
        raise MapError("cần ít nhất 2 phương án")
    if q.answer is not None and q.answer >= len(q.options):
        raise MapError(f"đáp án {LETTERS[q.answer]} không có trong {len(q.options)} phương án")
    if q.status == "PUBLISHED":
        if q.answer is None:
            raise MapError("câu PUBLISHED phải có answer")
        if not q.reason.strip():
            raise MapError("câu PUBLISHED phải có reason (lý do chọn đáp án, D-020)")
        if not q.verify:
            raise MapError("câu PUBLISHED phải có verify (cách kiểm chứng, D-020)")
    elif q.status in ("NEEDS_REVIEW", "DRAFT"):
        if not q.review_note:
            raise MapError(f"câu {q.status} phải có reviewNote")
    else:
        raise MapError(f"status '{q.status}' không hợp lệ")
    if q.kind == "open" and (len(q.options) != 4 or len(set(q.options)) != 4):
        raise MapError("câu hỏi mở phải có đúng 4 phương án khác nhau (choices)")
    if q.kind == "fill":
        blanks = len(BLANK_RE.findall(q.code or q.content))
        if len(q.options) != 4:
            raise MapError("câu điền khuyết phải có đúng 4 phương án (D-026)")
        if any(len(values) != blanks for values in q.fill_values or []):
            raise MapError(f"mỗi phương án điền khuyết phải có {blanks} giá trị (số chỗ trống {BLANK} hoặc ...)")
        if len(set(q.options)) != 4:
            raise MapError("4 phương án điền khuyết phải khác nhau")


# ---------------------------------------------------------------- Toàn bộ môn


def load_maps() -> list[dict]:
    maps = []
    for path in sorted(MAPS_DIR.glob("bai-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["_path"] = path
        maps.append(data)
    return maps


def build_all(allow_incomplete: bool) -> tuple[dict, list[Question], list[str], list[str]]:
    """Trả về (config, câu hỏi, lỗi, bài chưa có bản đồ)."""
    config = load_config()
    sources = {s["key"]: s for s in config["sources"]}
    pages = Pages(sources)
    questions: list[Question] = []
    errors: list[str] = []
    mapped_chapters: set[int] = set()
    used: dict[tuple[str, int, str], str] = {}

    for data in load_maps():
        chapter = data["chapter"]
        mapped_chapters.add(chapter)
        for entry in data.get("questions", []):
            try:
                question = build_question(pages, sources, chapter, entry)
            except (MapError, ValueError) as error:
                errors.append(f"{data['_path'].name} · {entry.get('ref', '?')}: {error}")
                continue
            questions.append(question)
            mark_used(used, question.source["key"], question.used_lines, question.ref, errors)
        for page_ref, ignored in data.get("ignore", {}).items():
            key, page = page_ref.split("/")
            for line_id, why in ignored.items():
                if not why.strip():
                    errors.append(f"{page_ref} {line_id}: bỏ qua dòng thì phải ghi lý do")
                mark_used(used, key, [(int(page), line_id)], f"bỏ qua: {why}", errors)

    check_coverage(config, pages, mapped_chapters, used, errors)
    check_duplicates(questions, errors)
    missing = [str(c["number"]) for c in config["chapters"] if c["number"] not in mapped_chapters]
    if missing and not allow_incomplete:
        errors.append(f"các bài chưa có bản đồ vị trí: {', '.join(missing)}")
    return config, questions, errors, missing


def mark_used(used: dict, key: str, lines: list[tuple[int, str]], owner: str, errors: list[str]) -> None:
    for page, line_id in lines:
        slot = (key, page, line_id)
        if slot in used:
            errors.append(f"{key} trang {page} dòng {line_id} dùng hai lần: {used[slot]} và {owner}")
        used[slot] = owner


def check_coverage(config: dict, pages: Pages, chapters: set[int], used: dict, errors: list[str]) -> None:
    """Mọi dòng trên mọi trang trắc nghiệm của các bài đã có bản đồ phải được dùng hoặc bỏ qua có lý do."""
    for source in config["sources"]:
        if source["chapter"] not in chapters:
            continue
        for page in pages.quiz_pages(source["key"]):
            leftover = [i for i in pages.lines(source["key"], page) if (source["key"], page, i) not in used]
            if leftover:
                errors.append(f"{source['key']} trang {page}: dòng chưa được xử lý {', '.join(leftover)}")


def check_duplicates(questions: list[Question], errors: list[str]) -> None:
    by_ref = {q.ref: q for q in questions}
    if len(by_ref) != len(questions):
        errors.append("có ref bị trùng")
    for q in questions:
        if q.duplicate_of:
            target = by_ref.get(q.duplicate_of)
            if not target or target.duplicate_of:
                errors.append(f"{q.ref}: duplicateOf '{q.duplicate_of}' phải trỏ tới một câu không phải câu trùng")


# ---------------------------------------------------------------- Ghi kết quả


def to_import_json(config: dict, questions: list[Question]) -> dict:
    chapters = []
    for chapter in config["chapters"]:
        items = [q for q in questions if q.chapter == chapter["number"] and not q.duplicate_of]
        chapters.append({
            "code": chapter["code"], "title": chapter["title"], "displayOrder": chapter["number"],
            "questions": [question_json(q) for q in items],
        })
    return {"formatVersion": 1, "subject": config["subject"], "chapters": chapters}


def question_json(q: Question) -> dict:
    return {
        "type": "SINGLE_CHOICE",
        "content": q.content,
        "codeSnippet": q.code,
        "explanation": None,
        "shuffleAnswers": q.shuffle,
        "status": q.status,
        "reviewNote": q.review_note,
        "source": {"file": q.source["file"], "page": q.page, "label": q.label},
        "answers": [{"content": text, "correct": i == q.answer} for i, text in enumerate(q.options)],
    }


def write_review(config: dict, questions: list[Question], missing: list[str], path: Path) -> None:
    out = ["# Python: danh sách cần duyệt", "", "Sinh tự động bởi `scripts/build_python_import.py`. Không commit (D-030).", ""]
    if missing:
        out += [f"> Bài chưa có bản đồ vị trí: {', '.join(missing)}.", ""]
    out += ["| Bài | Tên | PUBLISHED | NEEDS_REVIEW | Câu trùng bỏ qua |", "|---|---|---|---|---|"]
    for chapter in config["chapters"]:
        items = [q for q in questions if q.chapter == chapter["number"]]
        count = lambda status: sum(1 for q in items if q.status == status and not q.duplicate_of)
        out.append(f"| {chapter['number']} | {chapter['title']} | {count('PUBLISHED')} | {count('NEEDS_REVIEW')} "
                   f"| {sum(1 for q in items if q.duplicate_of)} |")

    review = [q for q in questions if q.status != "PUBLISHED" and not q.duplicate_of]
    out += ["", f"## Câu cần chủ dự án quyết định ({len(review)})", ""]
    for group in sorted({q.review_group or "" for q in review}):
        items = [q for q in review if (q.review_group or "") == group]
        out += ["", f"### {REVIEW_GROUPS.get(group, 'Khác')} ({len(items)})", ""]
        out += [f"- **{q.label}**: {q.review_note}" for q in items]
    duplicates = [q for q in questions if q.duplicate_of]
    out += ["", f"## Câu trùng đã bỏ qua ({len(duplicates)})", ""]
    out += [f"- {q.label} trùng {q.duplicate_of}" for q in duplicates]

    for chapter in config["chapters"]:
        items = [q for q in questions if q.chapter == chapter["number"] and not q.duplicate_of]
        if not items:
            continue
        out += ["", f"## Bài {chapter['number']}: {chapter['title']}", ""]
        for q in items:
            out += [f"### {q.label} · trang {q.page} · {q.status}", "", q.content, ""]
            if q.code:
                out += ["```python", q.code, "```", ""]
            for i, option in enumerate(q.options):
                mark = " ✅" if i == q.answer else ""
                out.append(f"- {LETTERS[i]}. {option.replace(chr(10), ' ⏎ ')}{mark}")
            if q.review_note:
                out += ["", f"> Cần duyệt: {q.review_note}"]
            if q.reason:
                out += ["", f"Lý do: {q.reason}"]
            out.append("")
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def main() -> int:
    allow_incomplete = "--allow-incomplete" in sys.argv
    config, questions, errors, missing = build_all(allow_incomplete)
    if errors:
        print(f"DỪNG: {len(errors)} lỗi, chưa ghi file.", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    write_review(config, questions, missing, GENERATED_DIR / "review.md")
    kept = [q for q in questions if not q.duplicate_of]
    print(f"OK: {len(kept)} câu ({sum(q.status == 'PUBLISHED' for q in kept)} PUBLISHED, "
          f"{sum(q.status != 'PUBLISHED' for q in kept)} cần duyệt), {len(questions) - len(kept)} câu trùng bỏ qua.")
    if missing:
        print(f"Chưa có bản đồ: bài {', '.join(missing)}. Không ghi import.json (đang làm dở).")
    else:
        path = GENERATED_DIR / "import.json"
        path.write_text(json.dumps(to_import_json(config, questions), ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
        print(f"  {path.relative_to(SEED_DIR.parents[2])}")
    print(f"  {(GENERATED_DIR / 'review.md').relative_to(SEED_DIR.parents[2])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
