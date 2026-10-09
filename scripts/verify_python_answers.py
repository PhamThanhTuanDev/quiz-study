"""Kiểm chứng đáp án môn Python bằng cách CHẠY THẬT code (D-020, D-026).

Đọc bản đồ vị trí (database/seed/python/questions/*.json), dựng câu hỏi từ PDF giống build_python_import.py,
rồi với mỗi câu thực hiện phần "verify":

  run         chạy code của đề (có thể thêm setup / thay chuỗi / in thêm / bọc bằng "wrap"), so kết quả in ra
              với "expect". Đề không có code thì viết code cần chạy vào "setup". "errorLine": true thì kết quả là
              "<TênLỗi> <số dòng>" hoặc "Không lỗi" (câu hỏi "bị lỗi ở dòng thứ mấy").
              Chữ cái đáp án được đối chiếu với kết quả chạy khi phương án cho phép: "answerIsOutput", phương án
              trùng kết quả (bỏ qua khoảng trắng, dấu phẩy, dấu nháy), phương án "Lỗi", số dòng của errorLine.
              Câu phát biểu lý thuyết (setup chỉ minh hoạ) không đối chiếu được; dòng tổng kết đếm riêng.
  runOptions  chạy code của từng phương án; đúng phương án "answer" (và chỉ nó) cho kết quả "want".
  output      câu "đoạn code cho kết quả gì" (câu tự soạn, D-049): chạy code của đề (có thể thêm setup / stdin),
              kết quả phải bằng "expect", và đúng phương án đáp án (chỉ nó) khớp kết quả: in ra giống hệt, hoặc
              khi code báo lỗi thì phương án có tên lỗi (ví dụ "Báo lỗi ZeroDivisionError").
  fill        thay từng bộ giá trị vào các dấu … của code; bộ đúng cho kết quả "want" ở mọi trường hợp,
              mỗi bộ sai phải khác "want" ở ít nhất một trường hợp (sai kết quả hoặc báo lỗi).
  docs        câu lý thuyết: phải có link tài liệu chính thức ("refs").
  reasoning   câu không chạy được code: phải ghi nguồn ("source").

Code chạy trong tiến trình Python riêng (chế độ cô lập -I), thư mục tạm, giới hạn thời gian. Đây không phải
sandbox: chỉ chạy code lấy từ tài liệu môn học của dự án.
Kết quả chuẩn hoá: stdout đã bỏ khoảng trắng cuối dòng; lỗi thành "ERROR: <TênLỗi>"; quá giờ thành "TIMEOUT".

Chạy từ thư mục gốc project:
    scripts\\.venv\\Scripts\\python scripts\\verify_python_answers.py [ref ...]
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile

from build_python_import import BLANK_RE, LETTERS, Question, build_all, normalize
from python_source import GENERATED_DIR

TIMEOUT_SECONDS = 5
# Matplotlib (D-045): vẽ ở chế độ Agg (không mở cửa sổ, plt.show() không chặn) và dùng chung bộ đệm font giữa
# các lần chạy; nếu không, mỗi lần chạy lại dựng bộ đệm font mất khoảng 4 giây, sát giới hạn thời gian.
MPL_CONFIG_DIR = GENERATED_DIR / ".mplconfig"
# So phương án với kết quả chạy: "9, 15, 27" khớp kết quả in "9\n15\n27", "‘c’" khớp "c".
LOOSE_IGNORED_RE = re.compile(r"[\s,'\"‘’“”]")
ERROR_OPTIONS = {"lỗi", "chươngtrìnhbịlỗi", "chươngtrìnhbáolỗi"}


def run_python(code: str, stdin: str = "", timeout: float = TIMEOUT_SECONDS) -> str:
    with tempfile.TemporaryDirectory() as workdir:
        try:
            # -I (cô lập) bỏ qua mọi biến môi trường PYTHON*, nên bật UTF-8 bằng tuỳ chọn -X utf8;
            # nếu không, Windows ghi lỗi bằng bảng mã cp1252 (ví dụ dấu nháy cong thành byte 0x92).
            result = subprocess.run(
                [sys.executable, "-I", "-X", "utf8", "-c", code], input=stdin, capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=timeout, cwd=workdir,
                env={"SYSTEMROOT": os.environ.get("SYSTEMROOT", ""), "MPLBACKEND": "Agg",
                     "MPLCONFIGDIR": str(MPL_CONFIG_DIR)},
            )
        except subprocess.TimeoutExpired:
            return "TIMEOUT"
    if result.returncode != 0:
        last = (result.stderr.strip().splitlines() or ["?"])[-1]
        return "ERROR: " + last.split(":")[0].strip()
    return "\n".join(line.rstrip() for line in result.stdout.strip().splitlines())


def program(q: Question, case: dict, body: str | None = None, strict: bool = True) -> str:
    code = q.code if body is None else body
    for old, new in case.get("replace", {}).items():
        if strict and old not in code:
            raise ValueError(f"không tìm thấy '{old}' trong code để thay")
        code = code.replace(old, new)
    return "\n".join(part for part in (case.get("setup"), code, case.get("append")) if part)


def check_replacements_used(bodies: list[str], cases: list[dict]) -> None:
    """Với runOptions, chuỗi cần thay chỉ cần có trong một phương án (ví dụ "Đáp án khác" không chứa code)."""
    for case in cases:
        for old in case.get("replace", {}):
            if not any(old in body for body in bodies):
                raise ValueError(f"không tìm thấy '{old}' trong phương án nào để thay")


def with_error_line(code: str) -> str:
    """Bọc code để in "<TênLỗi> <số dòng>" hoặc "Không lỗi", dùng cho câu "bị lỗi ở dòng thứ mấy"."""
    # __name__ = "__main__" để khối if __name__ == "__main__" chạy như khi chạy thật; số dòng lấy ở khung
    # cuối cùng thuộc code của đề ('de'), không phải khung trong thư viện chuẩn mà code đó gọi tới.
    return "\n".join([
        "import traceback",
        f"src = {code!r}",
        "try:",
        "    exec(compile(src, 'de', 'exec'), {'__name__': '__main__'})",
        "except SyntaxError as error:",
        "    print(type(error).__name__, error.lineno)",
        "except Exception as error:",
        "    frames = [frame for frame in traceback.extract_tb(error.__traceback__) if frame.filename == 'de']",
        "    print(type(error).__name__, frames[-1].lineno)",
        "else:",
        "    print('Không lỗi')",
    ])


def loose(text: str) -> str:
    return LOOSE_IGNORED_RE.sub("", text)


def check_answer_against_output(q: Question, got: str, error_line: bool) -> tuple[bool, list[str]]:
    """Kiểu run: đối chiếu chữ cái đáp án với kết quả chạy. Trả về (đối chiếu được không, danh sách lỗi)."""
    if q.answer is None:
        return False, []
    letter, marked = LETTERS[q.answer], q.options[q.answer]
    if error_line:
        last = got.splitlines()[-1] if got else ""
        ok = "không" in marked.lower() if last == "Không lỗi" else loose(marked) == last.split()[-1]
        return True, [] if ok else [f"dòng lỗi chạy ra {last!r}, đáp án {letter} là '{marked}'"]
    error_options = [i for i, option in enumerate(q.options) if loose(option).lower() in ERROR_OPTIONS]
    failed = got.startswith("ERROR")
    if error_options and failed != (q.answer in error_options):
        return True, [f"chạy ra {got!r} nhưng đáp án {letter} là '{marked}'"]
    if error_options and failed:
        return True, []
    matching = [i for i, option in enumerate(q.options) if loose(option) == loose(got)]
    if not matching:
        return False, []
    if q.answer in matching:
        return True, []
    return True, [f"phương án {', '.join(LETTERS[i] for i in matching)} khớp kết quả chạy, đáp án ghi {letter}"]


def blank_values(option: str, into_blanks: bool | str) -> list[str]:
    # intoBlanks là chuỗi phân cách khi một phương án điền nhiều chỗ trống, ví dụ "int, 1" với ", ".
    return option.split(into_blanks) if isinstance(into_blanks, str) else [option]


def fill_blanks(template: str, values: list[str]) -> str:
    parts = BLANK_RE.split(template)
    return "".join(part + (values[i] if i < len(values) else "") for i, part in enumerate(parts))


def check(q: Question) -> tuple[list[str], bool]:
    """Trả về (danh sách lỗi, rỗng nếu đạt; chữ cái đáp án có được đối chiếu tự động với kết quả chạy không)."""
    spec = q.verify or {}
    kind = spec.get("kind")
    answer = LETTERS[q.answer] if q.answer is not None else None

    if kind == "run":
        problems = []
        # "wrap" bọc code của đề, ví dụ "print({code})" khi đề chỉ là một biểu thức.
        body = spec["wrap"].replace("{code}", q.code or "") if "wrap" in spec else None
        outputs = []
        for case in spec["cases"]:
            code = program(q, case, body)
            if spec.get("errorLine"):
                code = with_error_line(code)
            got = run_python(code, case.get("stdin", ""))
            outputs.append(got)
            if got != case["expect"]:
                problems.append(f"chạy ra {got!r}, ghi là {case['expect']!r}")
        if spec.get("answerIsOutput"):
            if q.answer is None:
                raise ValueError("answerIsOutput cần có answer")
            if normalize(q.options[q.answer]) != normalize(spec["cases"][0]["expect"]):
                problems.append(f"phương án {answer} '{q.options[q.answer]}' khác kết quả chạy")
            return problems, True
        tied, answer_problems = check_answer_against_output(q, outputs[0], spec.get("errorLine", False))
        return problems + answer_problems, tied

    if kind == "runOptions":
        wrap = spec.get("wrap", "{option}")
        # "intoBlanks": phương án là giá trị điền vào dấu … trong code của đề (câu trắc nghiệm có chỗ trống).
        # "wrap" có thể chứa {code} (code của đề) và {option} (nội dung phương án).
        bodies = [fill_blanks(q.code or "", blank_values(option, spec["intoBlanks"])) if spec.get("intoBlanks")
                  else wrap.replace("{code}", q.code or "").replace("{option}", option)
                  for option in q.options]
        check_replacements_used(bodies, spec["cases"])
        matching = []
        for i, body in enumerate(bodies):
            outputs = [run_python(program(q, case, body, strict=False), case.get("stdin", ""))
                       for case in spec["cases"]]
            if all(got == case["want"] for got, case in zip(outputs, spec["cases"])):
                matching.append(LETTERS[i])
        return matching_problems(matching, answer), True

    if kind == "fill":
        template = q.code or q.content
        matching = []
        for i, values in enumerate(q.fill_values or []):
            filled = fill_blanks(template, values)
            outputs = [run_python(program(q, case, filled), case.get("stdin", "")) for case in spec["cases"]]
            if all(got == case["want"] for got, case in zip(outputs, spec["cases"])):
                matching.append(LETTERS[i])
        return matching_problems(matching, answer), True

    if kind == "output":
        got = run_python(program(q, spec), spec.get("stdin", ""))
        problems = [] if got == spec["expect"] else [f"chạy ra {got!r}, ghi là {spec['expect']!r}"]
        matching = [LETTERS[i] for i, option in enumerate(q.options) if output_matches(option, got)]
        return problems + matching_problems(matching, answer), True

    if kind == "docs":
        return ([] if spec.get("refs") else ["kiểm chứng kiểu docs phải có refs"]), False
    if kind == "reasoning":
        return ([] if spec.get("source") else ["kiểm chứng kiểu reasoning phải có source"]), False
    return [f"kiểu kiểm chứng không hợp lệ: {kind!r}"], False


def output_matches(option: str, got: str) -> bool:
    """Phương án khớp kết quả chạy: in ra giống hệt (đã bỏ khoảng trắng cuối dòng), hoặc nêu đúng tên lỗi."""
    if got.startswith("ERROR: "):
        return got.removeprefix("ERROR: ") in option
    return "\n".join(line.rstrip() for line in option.strip().splitlines()) == got


def matching_problems(matching: list[str], answer: str | None) -> list[str]:
    return [] if matching == [answer] else [f"phương án cho kết quả đúng: {matching or 'không có'}, đáp án ghi {answer}"]


def main() -> int:
    only = set(sys.argv[1:])
    _, questions, errors, _ = build_all(allow_incomplete=True)
    if errors:
        print("Bản đồ vị trí còn lỗi, chạy build_python_import.py để xem.", file=sys.stderr)
        return 1

    targets = [q for q in questions if q.verify and not q.duplicate_of and (not only or q.ref in only)]
    # Lần đầu trên máy mới, matplotlib dựng bộ đệm font (vài giây): làm trước một lần, không tính vào câu nào.
    MPL_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    run_python("import matplotlib.font_manager", timeout=120)
    failed = tied = 0
    for q in targets:
        try:
            problems, answer_tied = check(q)
        except (KeyError, ValueError, TypeError, IndexError) as error:
            # Lỗi cấu trúc của một mục verify: báo cho đúng câu đó, không dừng cả lượt kiểm chứng.
            problems, answer_tied = [f"verify sai cấu trúc: {type(error).__name__}: {error}"], False
        tied += answer_tied
        if problems:
            failed += 1
            print(f"✗ {q.ref} ({q.label}): " + "; ".join(problems))
    ran = sum(1 for q in targets if q.verify.get("kind") in ("run", "runOptions", "fill", "output"))
    print(f"{'OK' if not failed else 'LỖI'}: kiểm chứng {len(targets)} câu ({ran} câu chạy code thật, trong đó "
          f"{tied} câu chữ cái đáp án được đối chiếu tự động với kết quả chạy), {failed} câu không đạt.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
