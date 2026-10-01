<#
.SYNOPSIS
    Tạo icon PNG cho PWA (D-040) từ file SVG, bằng Chrome headless có sẵn trên máy (không thêm công cụ).

.DESCRIPTION
    - Icon thường (bo góc, nền trong suốt): lấy từ frontend/public/favicon.svg.
    - Icon "maskable" và apple-touch-icon (nền tràn viền): lấy từ scripts/pwa-icons/icon-maskable.svg.
    Kết quả ghi vào frontend/public/icons/. Chạy lại khi đổi logo.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\generate-pwa-icons.ps1
#>
[CmdletBinding()]
param(
    [string]$ChromeExe = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ChromeExe)) {
    throw "Không tìm thấy Chrome ở $ChromeExe. Chỉ đường dẫn khác bằng -ChromeExe."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot 'frontend\public\icons'
New-Item -ItemType Directory -Force $outputDir | Out-Null

$anyIcon = Join-Path $projectRoot 'frontend\public\favicon.svg'
$maskableIcon = Join-Path $PSScriptRoot 'pwa-icons\icon-maskable.svg'

# Chrome có độ rộng cửa sổ tối thiểu (lớn hơn 192px): chụp nhỏ hơn sẽ bị cắt. Nên luôn chụp ở 512px,
# rồi thu nhỏ bằng System.Drawing (có sẵn trong Windows PowerShell).
$renderSize = 512
$icons = @(
    @{ Source = $anyIcon; Size = 192; Name = 'icon-192.png' },
    @{ Source = $anyIcon; Size = 512; Name = 'icon-512.png' },
    @{ Source = $maskableIcon; Size = 512; Name = 'icon-maskable-512.png' },
    # iOS tự bo góc icon trên màn hình chính, nên dùng bản nền tràn viền.
    @{ Source = $maskableIcon; Size = 180; Name = 'apple-touch-icon.png' }
)

# Hồ sơ Chrome tạm, riêng: nếu dùng hồ sơ mặc định mà Chrome đang mở, lệnh sẽ bị chuyển sang cửa sổ đang mở
# và thoát ngay, không chụp gì.
$profileDir = Join-Path ([System.IO.Path]::GetTempPath()) 'quiz-study-icon-chrome'
$renderDir = Join-Path ([System.IO.Path]::GetTempPath()) 'quiz-study-icon-render'
New-Item -ItemType Directory -Force $renderDir | Out-Null
Add-Type -AssemblyName System.Drawing

function Invoke-ChromeScreenshot([string]$Source, [string]$Output) {
    Remove-Item $Output -ErrorAction SilentlyContinue
    $sourceUrl = 'file:///' + ($Source -replace '\\', '/')
    # SVG chỉ có viewBox thì phủ kín cửa sổ, nên kích thước cửa sổ là kích thước ảnh.
    # Nền trong suốt để góc bo của icon thường không bị tô trắng.
    $arguments = @(
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
        "--user-data-dir=`"$profileDir`"", '--default-background-color=00000000',
        "--window-size=$renderSize,$renderSize", "--screenshot=`"$Output`"", "`"$sourceUrl`""
    )
    # chrome.exe là ứng dụng có cửa sổ: phải dùng Start-Process -Wait thì PowerShell mới chờ chụp xong.
    Start-Process -FilePath $ChromeExe -ArgumentList $arguments -Wait -WindowStyle Hidden
    if (-not (Test-Path $Output)) {
        throw "Chrome không tạo được $Output"
    }
}

function Save-Resized([string]$Source, [int]$Size, [string]$Output) {
    $image = [System.Drawing.Image]::FromFile($Source)
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $Size, $Size)
        $bitmap.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $image.Dispose()
    }
}

try {
    $rendered = @{}
    foreach ($icon in $icons) {
        if (-not $rendered.ContainsKey($icon.Source)) {
            $render = Join-Path $renderDir ("render-" + $rendered.Count + ".png")
            Invoke-ChromeScreenshot -Source $icon.Source -Output $render
            $rendered[$icon.Source] = $render
        }
        $output = Join-Path $outputDir $icon.Name
        Save-Resized -Source $rendered[$icon.Source] -Size $icon.Size -Output $output
        Write-Host "Đã tạo $($icon.Name) ($($icon.Size)x$($icon.Size))"
    }
} finally {
    Remove-Item -Recurse -Force $profileDir, $renderDir -ErrorAction SilentlyContinue
}
