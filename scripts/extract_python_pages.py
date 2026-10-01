"""Xuất các slide "TRẮC NGHIỆM" của môn Python để Claude lập bản đồ vị trí câu hỏi (D-035).

Với mỗi file nguồn trong database/seed/python/subject.json: tìm slide trắc nghiệm, đánh số các dòng
chữ, rồi ghi vào database/seed/python/generated/pages/<key>/:
  - pNN.txt: danh sách dòng (mã dòng, loại chữ/code, toạ độ, nội dung)
  - pNN.png: ảnh slide để đối chiếu
Không commit (D-030). Chỉ ĐỌC file PDF.

Chạy từ thư mục gốc project:
    scripts\\.venv\\Scripts\\python scripts\\extract_python_pages.py
"""

from __future__ import annotations

import re
import sys

import pymupdf

from python_source import GENERATED_DIR, load_config, page_lines, quiz_page_numbers, source_path

QUESTION_START_RE = re.compile(r"^\s*\d+\s*\.")
IMAGE_DPI = 80


def main() -> int:
    config = load_config()
    pages_dir = GENERATED_DIR / "pages"
    missing = [s["file"] for s in config["sources"] if not source_path(s).exists()]
    if missing:
        print("Không tìm thấy PDF nguồn:", *missing, sep="\n  ", file=sys.stderr)
        return 1

    total = 0
    for source in config["sources"]:
        out_dir = pages_dir / source["key"]
        out_dir.mkdir(parents=True, exist_ok=True)
        with pymupdf.open(source_path(source)) as doc:
            quiz_pages = quiz_page_numbers(doc)
            starts = 0
            for number in quiz_pages:
                page = doc[number - 1]
                lines = page_lines(page)
                starts += sum(1 for line in lines if QUESTION_START_RE.match(line.text))
                (out_dir / f"p{number:02d}.txt").write_text(render(source, number, lines), encoding="utf-8")
                page.get_pixmap(dpi=IMAGE_DPI).save(out_dir / f"p{number:02d}.png")
        total += starts
        print(f"{source['label']:10s} trang trắc nghiệm {quiz_pages or '—'}; "
              f"dòng bắt đầu bằng số thứ tự câu: {starts} (khảo sát: {source['expectedQuestions']} câu)")
    print(f"Tổng dòng bắt đầu bằng số thứ tự câu: {total}. Kết quả: {pages_dir.relative_to(pages_dir.parents[4])}")
    return 0


def render(source: dict, page_number: int, lines: list) -> str:
    out = [f"== {source['label']} ({source['key']}) · trang {page_number}"]
    for line in lines:
        kind = "code" if line.is_code else "chữ"
        out.append(f"{line.id} [{kind:4s}] x={line.x:6.1f} y={line.y:6.1f}  {line.text}")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    sys.exit(main())
