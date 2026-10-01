"""Đọc slide PDF môn Python: tìm trang trắc nghiệm và đánh số các dòng chữ (D-035).

Dùng chung cho extract_python_pages.py (xuất trang để Claude lập bản đồ vị trí) và
build_python_import.py (dựng nội dung câu hỏi theo bản đồ). Hai script phải đánh số dòng giống hệt
nhau, nên cách đánh số chỉ nằm ở đây. Chỉ ĐỌC file PDF.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
SEED_DIR = ROOT / "database" / "seed" / "python"
CONFIG_PATH = SEED_DIR / "subject.json"
GENERATED_DIR = SEED_DIR / "generated"

QUIZ_TITLE_RE = re.compile(r"^(BÀI\s+)?TRẮC\s+NGHIỆM", re.IGNORECASE)
CODE_FONT_PREFIXES = ("Consolas", "Courier")

# Vùng tiêu đề slide (chữ "TRẮC NGHIỆM", số trang) và chân slide (tên môn, giảng viên), tính theo phần
# của chiều cao trang để không phụ thuộc kích thước slide.
HEADER_RATIO = 0.075
FOOTER_RATIO = 0.925

# Ranh giới hai cột, tính theo phần chiều rộng trang. Không dùng điểm giữa: có slide cột phải bắt đầu
# ở x ≈ 468 trên trang rộng 960 (w02.2 HW trang 4), còn nội dung cột trái không bắt đầu quá x ≈ 300.
COLUMN_SPLIT_RATIO = 0.42

# Lớp text của nhiều slide mất ký tự dấu cách ngay sau chữ có dấu tiếng Việt (ví dụ "thểđược", "quảcủa"),
# nhưng khoảng trống vẫn còn: ≈ 0,22 cỡ chữ (dấu cách Calibri), rộng hơn ở dòng căn đều. Giữa hai chữ cái
# liền nhau khoảng trống ≈ 0. Khoảng trống lớn hơn 0,15 cỡ chữ được coi là một dấu cách bị mất.
# Đã kiểm tra trên mọi trang trắc nghiệm của 19 file: 272 chỗ, tất cả đều là ranh giới giữa hai từ.
MISSING_SPACE_GAP_RATIO = 0.15


@dataclass(frozen=True)
class PageLine:
    id: str  # "L01", "R07": cột trái / phải + thứ tự từ trên xuống
    column: str
    x: float
    y: float
    x_end: float  # mép phải của dòng, để ghép hai khung chữ nằm trên cùng một hàng code
    text: str
    is_code: bool  # mọi chữ của dòng dùng font code (Consolas)
    char_width: float | None  # bề rộng một ký tự font code, để tính thụt lề; None nếu không phải code


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def source_path(source: dict) -> Path:
    return ROOT / source["file"]


def is_quiz_page(page: pymupdf.Page) -> bool:
    header_limit = page.rect.height * HEADER_RATIO
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"]).strip()
            if text and line["bbox"][1] < header_limit and QUIZ_TITLE_RE.match(text):
                return True
    return False


def quiz_page_numbers(doc: pymupdf.Document) -> list[int]:
    """Số trang (bắt đầu từ 1) của các slide có tiêu đề "TRẮC NGHIỆM"."""
    return [page.number + 1 for page in doc if is_quiz_page(page)]


def page_lines(page: pymupdf.Page) -> list[PageLine]:
    """Các dòng chữ của một slide (bỏ tiêu đề và chân slide), sắp theo cột rồi từ trên xuống, trái sang phải."""
    header_limit = page.rect.height * HEADER_RATIO
    footer_limit = page.rect.height * FOOTER_RATIO
    column_split = page.rect.width * COLUMN_SPLIT_RATIO

    raw: list[tuple[str, float, float, float, str, bool, float | None]] = []
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            spans = [span for span in line["spans"] if span["chars"]]
            for span in spans:
                span["text"] = "".join(char["c"] for char in span["chars"])
            text = line_text(spans)
            x, y, x_end = line["bbox"][0], line["bbox"][1], line["bbox"][2]
            if not text.strip() or y < header_limit or y > footer_limit:
                continue
            visible = [span for span in spans if span["text"].strip()]
            is_code = all(span["font"].startswith(CODE_FONT_PREFIXES) for span in visible)
            char_width = code_char_width(visible) if is_code else None
            raw.append(("L" if x < column_split else "R", x, y, x_end, text, is_code, char_width))

    raw.sort(key=lambda item: (item[0], round(item[2], 1), item[1]))
    lines: list[PageLine] = []
    counters = {"L": 0, "R": 0}
    for column, x, y, x_end, text, is_code, char_width in raw:
        counters[column] += 1
        lines.append(PageLine(f"{column}{counters[column]:02d}", column, x, y, x_end, text, is_code, char_width))
    return lines


def line_text(spans: list[dict]) -> str:
    """Ghép ký tự của một dòng, thêm lại dấu cách bị mất ở chỗ có khoảng trống (xem MISSING_SPACE_GAP_RATIO)."""
    text = ""
    previous = None
    for span in spans:
        for char in span["chars"]:
            if previous is not None and char["c"] != " " and previous["c"] != " ":
                gap = char["bbox"][0] - previous["bbox"][2]
                if gap > MISSING_SPACE_GAP_RATIO * span["size"]:
                    text += " "
            text += char["c"]
            previous = char
    return text


def code_char_width(spans: list[dict]) -> float:
    """Font code có mọi ký tự rộng bằng nhau: lấy bề rộng span dài nhất chia số ký tự."""
    span = max(spans, key=lambda item: len(item["text"]))
    return (span["bbox"][2] - span["bbox"][0]) / len(span["text"])
