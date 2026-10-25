"""Vẽ biểu đồ Matplotlib thành ảnh PNG cho câu "kết quả biểu đồ" (D-055).

Dùng chung cho build_python_import.py (nhúng ảnh của từng phương án vào import.json) và verify_python_answers.py
(vẽ lại để kiểm chứng). Code chạy trong tiến trình Python riêng (chế độ cô lập -I), thư mục tạm, chế độ Agg (không
mở cửa sổ, plt.show() không chặn), giới hạn thời gian. Đây không phải sandbox: chỉ chạy code lấy từ slide môn học
và các biến thể do Claude soạn.

Ảnh không có thông tin phiên bản phần mềm (metadata), nên cùng code và cùng phiên bản matplotlib cho ra cùng
một file: database lưu ảnh theo mã băm, import lại không sinh ảnh trùng.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from python_source import GENERATED_DIR

MPL_CONFIG_DIR = GENERATED_DIR / ".mplconfig"
# 80 dpi với khung mặc định 6.4 × 4.8 inch: khoảng 510 × 385 điểm ảnh, đủ rõ khi phóng to trên điện thoại.
DPI = 80
TIMEOUT_SECONDS = 60


class ChartError(Exception):
    """Code vẽ biểu đồ chạy lỗi."""


def render_png(code: str, setup: str = "") -> bytes:
    """Chạy setup + code rồi lưu hình đang vẽ (plt.gcf()) thành PNG."""
    with tempfile.TemporaryDirectory() as workdir:
        out = Path(workdir) / "chart.png"
        # Ghép chuỗi thay vì str.format: code có dấu ngoặc nhọn (dict) sẽ làm format lỗi.
        script = "\n".join([
            "import matplotlib",
            "matplotlib.use('Agg')",
            "import matplotlib.pyplot as plt",
            setup,
            code,
            f"plt.gcf().savefig({str(out)!r}, format='png', dpi={DPI}, bbox_inches='tight', metadata={{'Software': None}})",
        ])
        MPL_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        try:
            result = subprocess.run(
                [sys.executable, "-I", "-c", script], cwd=workdir, capture_output=True, encoding="utf-8",
                errors="replace", timeout=TIMEOUT_SECONDS,
                env={"SYSTEMROOT": os.environ.get("SYSTEMROOT", ""), "MPLBACKEND": "Agg",
                     "MPLCONFIGDIR": str(MPL_CONFIG_DIR), "PYTHONIOENCODING": "utf-8"},
            )
        except subprocess.TimeoutExpired as error:
            raise ChartError("vẽ quá thời gian cho phép") from error
        if result.returncode != 0 or not out.exists():
            lines = [line for line in result.stderr.strip().splitlines() if line.strip()]
            raise ChartError(lines[-1] if lines else "không tạo được ảnh")
        return out.read_bytes()


def image_hash(png: bytes) -> str:
    """Mã băm theo điểm ảnh (không theo byte của file), để so hai hình có giống nhau không."""
    from PIL import Image  # Pillow có sẵn khi cài matplotlib

    with tempfile.TemporaryDirectory() as workdir:
        path = Path(workdir) / "chart.png"
        path.write_bytes(png)
        with Image.open(path) as image:
            rgba = image.convert("RGBA")
            return hashlib.sha256(f"{rgba.size}".encode() + rgba.tobytes()).hexdigest()
