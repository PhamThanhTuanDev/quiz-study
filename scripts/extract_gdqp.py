"""Trích xuất câu hỏi môn GDQP từ PDF nguồn thành file JSON để import (D-029, D-030).

- Chỉ ĐỌC file PDF; không sửa, đổi tên hay di chuyển nó.
- Đáp án lấy theo chữ đỏ trong tài liệu; các chỗ tô đỏ không rõ ràng dùng quyết định trong
  database/seed/gdqp/subject.json (G1, G2 theo D-021).
- Chỉ chuẩn hoá khoảng trắng / xuống dòng; giữ nguyên chữ, dấu câu và thứ tự phương án.
- Tự kiểm tra và dừng (mã lỗi 1) nếu kết quả không khớp số liệu khảo sát.

Chạy từ thư mục gốc project:
    scripts\\.venv\\Scripts\\python scripts\\extract_gdqp.py

Kết quả (không commit, D-030): database/seed/gdqp/generated/import.json và review.md.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "database" / "seed" / "gdqp" / "subject.json"
OUTPUT_DIR = ROOT / "database" / "seed" / "gdqp" / "generated"

RED = 0xFF0000
BOLD_FLAG = 16
ANSWER_LETTERS = "ABCD"

CHAPTER_RE = re.compile(r"^BÀI\s+(\d+)\s*:\s*(.*)$")
QUESTION_RE = re.compile(r"^Câu\s+(\d+)\s*:\s*(.*)$")
ANSWER_RE = re.compile(r"^([A-D])\.\s*(.*)$")

# Phương án phụ thuộc vị trí ("Tất cả đều đúng", "Cả 3 đáp án trên"…): xáo trộn sẽ làm sai nghĩa.
POSITION_DEPENDENT_RE = re.compile(
    r"tất cả|cả\s+(3|ba|2|hai|4|bốn)\b|(đáp án|phương án|ý)\s+trên|\b[A-D]\s*(và|,)\s*[A-D]\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------- Đọc PDF thành các dòng


@dataclass
class Line:
    page: int
    chars: list[tuple[str, bool]]  # từng ký tự và việc nó có màu đỏ không
    bold: bool
    from_vertical_label: bool = False

    @property
    def text(self) -> str:
        return "".join(char for char, _ in self.chars)


def normalize(text: str) -> str:
    """Chỉ chuẩn hoá khoảng trắng: gộp nhiều khoảng trắng/xuống dòng thành một dấu cách."""
    return " ".join(text.split())


def join_lines(parts: list[str]) -> str:
    """Nối các dòng bị ngắt do layout thành một đoạn.

    Word giữ dấu cách ở cuối dòng khi xuống dòng giữa hai từ, nên nối thẳng là đủ. Dòng kết thúc bằng
    dấu gạch nối mà không có dấu cách (ví dụ "Mác-" / "Lênin") là từ ghép bị ngắt: nối liền, không thêm
    dấu cách. Các trường hợp khác thêm một dấu cách để hai từ không dính vào nhau.
    """
    text = ""
    for part in parts:
        if text and not text[-1].isspace() and not ends_with_word_hyphen(text):
            text += " "
        text += part
    return normalize(text)


def ends_with_word_hyphen(text: str) -> bool:
    """"Mác-" (gạch nối dính vào chữ) là từ ghép bị ngắt; "a -" (có dấu cách trước gạch) thì không."""
    return len(text) > 1 and text.endswith("-") and not text[-2].isspace()


def without_whitespace(text: str) -> str:
    return "".join(text.split())


def read_lines(pdf_path: Path) -> list[Line]:
    """Đọc mọi dòng chữ theo thứ tự nội dung của PDF (thứ tự của văn bản Word gốc).

    Không sắp xếp theo toạ độ: ở trang 30, các khung chữ bị chồng lên nhau nên toạ độ không phản ánh
    thứ tự đọc, còn thứ tự nội dung vẫn đúng (nhãn → đề → phương án).
    """
    lines: list[Line] = []
    with pymupdf.open(pdf_path) as doc:
        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                for raw in block.get("lines", []):
                    spans = raw["spans"]
                    chars = [(char, span["color"] == RED) for span in spans for char in span["text"]]
                    if not "".join(char for char, _ in chars).strip():
                        continue
                    bold = any(span["flags"] & BOLD_FLAG and span["text"].strip() for span in spans)
                    lines.append(Line(page.number + 1, chars, bold))
    return merge_vertical_labels(lines)


def merge_vertical_labels(lines: list[Line]) -> list[Line]:
    """Ghép nhãn bị tách thành từng ký tự theo chiều dọc (Bài 9: "C", "â", "u", " ", "1", "1", ":").

    Nhãn "Câu 11:" nằm trong khung chữ hẹp nên mỗi ký tự thành một dòng. Dòng chỉ có một ký tự in đậm,
    đứng liền nhau, được ghép lại thành một dòng.
    """
    merged: list[Line] = []
    buffer: list[Line] = []

    def flush() -> None:
        if len(buffer) >= 3:
            # Dòng chỉ có dấu cách (giữa "Câu" và số) đã bị bỏ ở read_lines, nên thêm lại ở đây.
            text = re.sub(r"^Câu(\d)", r"Câu \1", "".join(item.text.strip() for item in buffer))
            merged.append(Line(buffer[0].page, [(char, False) for char in text], True, from_vertical_label=True))
        else:
            merged.extend(buffer)
        buffer.clear()

    for line in lines:
        if line.bold and len(line.text.strip()) == 1:
            buffer.append(line)
            continue
        flush()
        merged.append(line)
    flush()
    return merged


# ---------------------------------------------------------------- Tách bài / câu / phương án


@dataclass
class Answer:
    letter: str
    parts: list[str] = field(default_factory=list)
    # Chỉ đếm chữ và số của nội dung: nhãn "A." và dấu câu đôi khi có màu khác nội dung
    # (ví dụ nhãn màu đen, hay chỉ dấu chấm cuối câu màu đỏ ở G1), không nói lên đáp án.
    letter_chars: int = 0
    red_letter_chars: int = 0

    @property
    def content(self) -> str:
        return join_lines(self.parts)

    @property
    def red_ratio(self) -> float:
        return self.red_letter_chars / self.letter_chars if self.letter_chars else 0.0


@dataclass
class Question:
    number: int
    page: int
    parts: list[str] = field(default_factory=list)
    answers: list[Answer] = field(default_factory=list)
    label_from_vertical_text: bool = False
    occurrence: int = 1  # lần xuất hiện thứ mấy của cùng số câu trong bài (G3)
    correct_letter: str | None = None
    decision_note: str | None = None
    shuffle_answers: bool = True

    @property
    def content(self) -> str:
        return join_lines(self.parts)


@dataclass
class Chapter:
    number: int
    title_parts: list[str] = field(default_factory=list)
    questions: list[Question] = field(default_factory=list)

    @property
    def pdf_title(self) -> str:
        return join_lines(self.title_parts)


def parse(lines: list[Line]) -> tuple[list[str], list[Chapter]]:
    """Đọc lần lượt từng dòng, giữ nguyên dấu cách cuối dòng để `join_lines` nối đúng.

    Trả về (các dòng trước bài đầu tiên, danh sách bài).
    """
    preamble: list[str] = []
    chapters: list[Chapter] = []
    question: Question | None = None
    answer: Answer | None = None

    for line in lines:
        indent = len(line.text) - len(line.text.lstrip())
        text = line.text[indent:]
        if match := CHAPTER_RE.match(text):
            chapters.append(Chapter(int(match.group(1)), [match.group(2)]))
            question, answer = None, None
        elif not chapters:
            preamble.append(text)  # tiêu đề "CÂU HỎI ÔN TẬP" trước bài đầu tiên
        elif match := QUESTION_RE.match(text):
            question = Question(int(match.group(1)), line.page, [match.group(2)],
                                label_from_vertical_text=line.from_vertical_label)
            chapters[-1].questions.append(question)
            answer = None
        elif question and (match := ANSWER_RE.match(text)):
            answer = Answer(match.group(1), [match.group(2)])
            question.answers.append(answer)
            add_color(answer, line.chars[indent + match.start(2):])  # bỏ qua nhãn "A. "
        elif answer:
            answer.parts.append(text)  # phương án dài xuống dòng
            add_color(answer, line.chars)
        elif question:
            question.parts.append(text)  # đề dài xuống dòng
        else:
            chapters[-1].title_parts.append(text)  # tên bài dài 2–3 dòng
    return preamble, chapters


def add_color(answer: Answer, chars: list[tuple[str, bool]]) -> None:
    for char, red in chars:
        if char.isalnum():
            answer.letter_chars += 1
            answer.red_letter_chars += red


# ---------------------------------------------------------------- Đáp án, xáo trộn, nguồn


def assign_occurrences(chapters: list[Chapter]) -> None:
    for chapter in chapters:
        seen: Counter[int] = Counter()
        for question in chapter.questions:
            seen[question.number] += 1
            question.occurrence = seen[question.number]


def fully_red_letters(question: Question) -> list[str]:
    return [a.letter for a in question.answers if a.red_ratio == 1.0]


def partially_red_letters(question: Question) -> list[str]:
    return [a.letter for a in question.answers if 0.0 < a.red_ratio < 1.0]


def assign_correct_answers(chapters: list[Chapter], overrides: list[dict], errors: list[str]) -> None:
    # "occurrence" (mặc định 1) chọn câu nào khi một số câu bị trùng trong cùng bài (G3).
    by_key = {(o["chapter"], o["question"], o.get("occurrence", 1)): o for o in overrides}
    used: set[tuple[int, int, int]] = set()

    for chapter in chapters:
        for question in chapter.questions:
            key = (chapter.number, question.number, question.occurrence)
            red = fully_red_letters(question)
            if key in by_key:
                override = by_key[key]
                used.add(key)
                if len(red) == 1 and not partially_red_letters(question) and red[0] != override["correct"]:
                    errors.append(f"{label_of(chapter, question)}: quyết định {override['decision']} chọn "
                                  f"{override['correct']} nhưng tài liệu tô đỏ rõ ràng {red[0]}")
                question.correct_letter = override["correct"]
                question.decision_note = f"Đáp án theo quyết định {override['decision']}: {override['reason']}"
            elif len(red) == 1 and not partially_red_letters(question):
                question.correct_letter = red[0]
            else:
                errors.append(f"{label_of(chapter, question)}: không xác định được đúng 1 đáp án đỏ "
                              f"(đỏ toàn bộ: {red or 'không có'}, đỏ một phần: {partially_red_letters(question)})")

    for chapter_no, question_no, occurrence in by_key.keys() - used:
        errors.append(f"Quyết định cho Bài {chapter_no} – Câu {question_no} (lần {occurrence}) không khớp câu hỏi nào")


def mark_position_dependent(chapters: list[Chapter]) -> None:
    for chapter in chapters:
        for question in chapter.questions:
            if any(POSITION_DEPENDENT_RE.search(a.content) for a in question.answers):
                question.shuffle_answers = False


def has_hyphen_join(question: Question) -> bool:
    groups = [question.parts] + [a.parts for a in question.answers]
    return any(ends_with_word_hyphen(part) for parts in groups for part in parts[:-1])


def label_of(chapter: Chapter, question: Question) -> str:
    label = f"Bài {chapter.number} – Câu {question.number}"
    return label if question.occurrence == 1 else f"{label} (lần {question.occurrence})"


# ---------------------------------------------------------------- Tự kiểm tra


def check(preamble: list[str], chapters: list[Chapter], config: dict, pdf_text: str, errors: list[str]) -> None:
    check_nothing_lost_or_moved(preamble, chapters, pdf_text, errors)
    expected = config["chapters"]
    if [c.number for c in chapters] != [c["number"] for c in expected]:
        errors.append(f"Danh sách bài đọc được {[c.number for c in chapters]} khác cấu hình")
        return

    for chapter, wanted in zip(chapters, expected):
        # Tên hiển thị có thể được chủ dự án sửa (ghi rõ "sourceTitle" + "titleDecision"); vẫn đối chiếu với tên gốc.
        source_title = wanted.get("sourceTitle", wanted["title"])
        if chapter.pdf_title.casefold() != normalize(source_title).casefold():
            errors.append(f"Bài {chapter.number}: tên trong PDF '{chapter.pdf_title}' khác cấu hình '{source_title}'")
        if "sourceTitle" in wanted and not wanted.get("titleDecision"):
            errors.append(f"Bài {chapter.number}: sửa tên bài so với PDF thì phải ghi titleDecision")
        if len(chapter.questions) != wanted["expectedQuestions"]:
            errors.append(f"Bài {chapter.number}: đọc được {len(chapter.questions)} câu, "
                          f"khảo sát ghi {wanted['expectedQuestions']}")
        for question in chapter.questions:
            letters = "".join(a.letter for a in question.answers)
            if letters != ANSWER_LETTERS:
                errors.append(f"{label_of(chapter, question)}: phương án {letters or 'không có'}, cần đúng A–D")
            texts = [question.content] + [a.content for a in question.answers]
            if any(not t for t in texts):
                errors.append(f"{label_of(chapter, question)}: có đề hoặc phương án rỗng")
            for t in texts:
                if t and without_whitespace(t) not in pdf_text:
                    errors.append(f"{label_of(chapter, question)}: không tìm thấy nguyên văn trong PDF: '{t[:60]}…'")


def check_nothing_lost_or_moved(preamble: list[str], chapters: list[Chapter], pdf_text: str,
                                errors: list[str]) -> None:
    """Ghép lại mọi thứ đã tách (kèm nhãn "BÀI n:", "Câu n:", "A."), theo đúng thứ tự: phải bằng đúng
    mọi ký tự của PDF.

    Kiểm tra từng câu có nguyên văn trong PDF chỉ bắt được chữ bị thêm hay sửa. Bước này bắt thêm chữ bị
    bỏ sót, và dòng bị gán nhầm sang câu / phương án khác (vì thứ tự sẽ lệch).
    """
    rebuilt = without_whitespace("".join(preamble) + "".join(rebuild(chapter) for chapter in chapters))
    if rebuilt == pdf_text:
        return
    at = next((i for i, (a, b) in enumerate(zip(rebuilt, pdf_text)) if a != b), min(len(rebuilt), len(pdf_text)))
    errors.append(f"Dữ liệu tách ra khác toàn văn PDF từ ký tự thứ {at}: tách được "
                  f"'…{rebuilt[max(0, at - 30):at + 30]}…', PDF là '…{pdf_text[max(0, at - 30):at + 30]}…'")


def rebuild(chapter: Chapter) -> str:
    parts = [f"BÀI{chapter.number}:", *chapter.title_parts]
    for question in chapter.questions:
        parts += [f"Câu{question.number}:", *question.parts]
        for answer in question.answers:
            parts += [f"{answer.letter}.", *answer.parts]
    return "".join(parts)


def plain_pdf_text(pdf_path: Path) -> str:
    """Toàn bộ ký tự của PDF (bỏ khoảng trắng), đọc theo cách khác: chế độ text thường.

    Dùng để kiểm tra độc lập rằng không ký tự nào bị thêm, mất hay đổi khi trích xuất. Khoảng trắng
    được bỏ vì cách nối dòng là việc của `join_lines`, được liệt kê riêng trong review.md.
    """
    with pymupdf.open(pdf_path) as doc:
        return without_whitespace("".join(page.get_text() for page in doc))


# ---------------------------------------------------------------- Ghi kết quả


def to_import_json(chapters: list[Chapter], config: dict) -> dict:
    source_file = config["source"]["file"]
    return {
        "formatVersion": 1,
        "subject": config["subject"],
        "chapters": [
            {
                "code": f"Bài {chapter.number}",
                "title": wanted["title"],
                "displayOrder": chapter.number,
                "questions": [question_json(chapter, q, source_file) for q in chapter.questions],
            }
            for chapter, wanted in zip(chapters, config["chapters"])
        ],
    }


def question_json(chapter: Chapter, question: Question, source_file: str) -> dict:
    return {
        "type": "SINGLE_CHOICE",
        "content": question.content,
        "codeSnippet": None,
        "explanation": None,
        "shuffleAnswers": question.shuffle_answers,
        "status": "PUBLISHED",
        "reviewNote": question.decision_note,
        "source": {"file": source_file, "page": question.page, "label": label_of(chapter, question)},
        "answers": [{"content": a.content, "correct": a.letter == question.correct_letter} for a in question.answers],
    }


def write_review(chapters: list[Chapter], config: dict, path: Path) -> None:
    out: list[str] = ["# GDQP: danh sách cần duyệt", "",
                      "File sinh tự động bởi `scripts/extract_gdqp.py`. Không commit (D-030).", "",
                      "## Số câu theo bài", "", "| Bài | Tên | Số câu |", "|---|---|---|"]
    for chapter, wanted in zip(chapters, config["chapters"]):
        out.append(f"| {chapter.number} | {wanted['title']} | {len(chapter.questions)} |")
    out.append(f"| | **Tổng** | **{sum(len(c.questions) for c in chapters)}** |")

    def section(title: str, note: str, items: list[tuple[Chapter, Question]]) -> None:
        out.extend(["", f"## {title} ({len(items)})", "", note, ""])
        for chapter, question in items:
            out.append(f"### {label_of(chapter, question)} (trang {question.page})")
            out.append("")
            out.append(question.content)
            out.append("")
            for a in question.answers:
                mark = " ✅" if a.letter == question.correct_letter else ""
                red = f" _(đỏ {a.red_ratio:.0%})_" if 0 < a.red_ratio < 1 else ""
                out.append(f"- {a.letter}. {a.content}{mark}{red}")
            if question.decision_note:
                out.append(f"\n> {question.decision_note}")
            out.append("")

    pairs = [(c, q) for c in chapters for q in c.questions]
    section("Đáp án theo quyết định của chủ dự án", "Tài liệu tô đỏ không rõ ràng; đáp án lấy theo `answerOverrides`.",
            [(c, q) for c, q in pairs if q.decision_note])
    section("Câu không xáo trộn phương án", "Có phương án phụ thuộc vị trí; `shuffleAnswers = false`.",
            [(c, q) for c, q in pairs if not q.shuffle_answers])
    section("Số câu bị trùng trong cùng bài (G3)", "Được đánh số lại; nhãn gốc ghi \"(lần 2)\".",
            [(c, q) for c, q in pairs if q.occurrence > 1 or any(
                o.number == q.number and o.occurrence > 1 for o in c.questions)])
    section("Có dòng nối liền sau dấu gạch nối", "Dòng trong PDF kết thúc bằng \"-\" không có dấu cách "
            "(ví dụ \"Mác-\" / \"Lênin\") nên được nối liền. Hãy kiểm tra không có từ nào bị dính sai.",
            [(c, q) for c, q in pairs if has_hyphen_join(q)])
    section("Nhãn câu bị tách dọc trong PDF", "Trang này trong PDF có khung chữ chồng lên nhau; nội dung đọc theo "
            "thứ tự của văn bản gốc. Hãy kiểm tra đề và phương án khớp nhau.",
            [(c, q) for c, q in pairs if q.label_from_vertical_text])
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- Chạy


def main() -> int:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    pdf_path = ROOT / config["source"]["file"]
    if not pdf_path.exists():
        print(f"Không tìm thấy PDF nguồn: {pdf_path}", file=sys.stderr)
        return 1

    preamble, chapters = parse(read_lines(pdf_path))
    assign_occurrences(chapters)
    errors: list[str] = []
    assign_correct_answers(chapters, config["answerOverrides"], errors)
    mark_position_dependent(chapters)
    check(preamble, chapters, config, plain_pdf_text(pdf_path), errors)

    if errors:
        print(f"DỪNG: {len(errors)} lỗi, chưa ghi file.", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    import_path = OUTPUT_DIR / "import.json"
    import_path.write_text(json.dumps(to_import_json(chapters, config), ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    write_review(chapters, config, OUTPUT_DIR / "review.md")

    total = sum(len(c.questions) for c in chapters)
    no_shuffle = sum(not q.shuffle_answers for c in chapters for q in c.questions)
    print(f"OK: {len(chapters)} bài, {total} câu, {no_shuffle} câu không xáo trộn phương án.")
    print(f"  {import_path.relative_to(ROOT)}")
    print(f"  {(OUTPUT_DIR / 'review.md').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
