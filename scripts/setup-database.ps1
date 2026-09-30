<#
.SYNOPSIS
    Tạo database quiz_study, quiz_study_test và user quiz_app trên MySQL local.

.DESCRIPTION
    1. Đọc file .env ở thư mục gốc project (tạo từ .env.example nếu chưa có).
    2. Nếu DB_PASSWORD trống: sinh mật khẩu ngẫu nhiên và ghi vào .env.
    3. Chạy database/init/01-create-database.sql bằng tài khoản root của MySQL.
       mysql.exe tự hỏi mật khẩu root; script không đọc và không lưu mật khẩu này.

    Chạy lại nhiều lần vẫn an toàn: không xoá dữ liệu, chỉ đồng bộ mật khẩu quiz_app với .env.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1 -MySqlExe "D:\MySQL\bin\mysql.exe"
#>
[CmdletBinding()]
param(
    # Đường dẫn tới mysql.exe. Bỏ trống thì tìm trong PATH, rồi trong thư mục cài đặt MySQL mặc định.
    [string]$MySqlExe,

    # Tài khoản quản trị MySQL dùng để tạo database và user.
    [string]$RootUser = 'root'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
$envExampleFile = Join-Path $projectRoot '.env.example'
$sqlFile = Join-Path $projectRoot 'database\init\01-create-database.sql'
$passwordPlaceholder = '__QUIZ_APP_PASSWORD__'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-EnvFile([string]$path) {
    $values = @{}
    foreach ($line in [System.IO.File]::ReadAllLines($path)) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            $values[$Matches[1]] = $Matches[2].Trim()
        }
    }
    return $values
}

function Set-EnvValue([string]$path, [string]$key, [string]$value) {
    $found = $false
    [string[]]$lines = foreach ($line in [System.IO.File]::ReadAllLines($path)) {
        if ($line -match "^\s*$key\s*=") {
            $found = $true
            "$key=$value"
        } else {
            $line
        }
    }
    if (-not $found) {
        $lines += "$key=$value"
    }
    # Không ghi BOM: Spring Boot đọc .env như file .properties, BOM sẽ làm hỏng dòng đầu.
    [System.IO.File]::WriteAllLines($path, $lines, $utf8NoBom)
}

# Bảng chữ cái đúng 64 ký tự để mỗi byte ngẫu nhiên map đều (256 chia hết cho 64).
# Chỉ gồm chữ, số, '-' và '_' nên không phá cú pháp SQL hay .env; vòng lặp bảo đảm có đủ
# 4 loại ký tự để đạt chính sách validate_password nếu MySQL có bật.
function New-RandomPassword([int]$length = 24) {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] $length
        do {
            $rng.GetBytes($bytes)
            $password = -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
        } until ($password -cmatch '[A-Z]' -and $password -cmatch '[a-z]' -and
                 $password -match '[0-9]' -and $password -match '[-_]')
        return $password
    } finally {
        $rng.Dispose()
    }
}

function Find-MySqlExe {
    $command = Get-Command 'mysql.exe' -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    $installed = Get-ChildItem "$env:ProgramFiles\MySQL\MySQL Server *\bin\mysql.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($installed) {
        return $installed.FullName
    }
    throw 'Không tìm thấy mysql.exe. Chạy lại với tham số -MySqlExe "<đường dẫn tới mysql.exe>".'
}

# --- 1. Chuẩn bị .env ---
if (-not (Test-Path $envFile)) {
    Copy-Item $envExampleFile $envFile
    Write-Host 'Đã tạo .env từ .env.example.'
}
$config = Read-EnvFile $envFile

# --- 2. Mật khẩu cho quiz_app ---
$password = $config['DB_PASSWORD']
if ([string]::IsNullOrEmpty($password)) {
    $password = New-RandomPassword
    Set-EnvValue $envFile 'DB_PASSWORD' $password
    Write-Host 'Đã sinh mật khẩu ngẫu nhiên cho quiz_app và lưu vào .env (DB_PASSWORD).'
}
if ($password -match "['\\]") {
    throw "DB_PASSWORD trong .env không được chứa dấu nháy đơn (') hoặc dấu \ vì sẽ phá câu lệnh SQL."
}

# --- 3. Chạy script SQL bằng tài khoản root ---
$mysql = if ($MySqlExe) { $MySqlExe } else { Find-MySqlExe }
$dbHost = if ($config['DB_HOST']) { $config['DB_HOST'] } else { 'localhost' }
$dbPort = if ($config['DB_PORT']) { $config['DB_PORT'] } else { '3306' }
$sql = [System.IO.File]::ReadAllText($sqlFile).Replace($passwordPlaceholder, $password)

Write-Host "Dùng: $mysql"
Write-Host "Kết nối MySQL tại ${dbHost}:${dbPort} bằng tài khoản '$RootUser'."
Write-Host "Nhập mật khẩu của '$RootUser' khi mysql hỏi (Enter password):"

# Truyền SQL qua stdin để mật khẩu quiz_app không nằm trên dòng lệnh hay trong file tạm.
$OutputEncoding = $utf8NoBom
$sql | & $mysql "--user=$RootUser" '--password' "--host=$dbHost" "--port=$dbPort" '--default-character-set=utf8mb4'
if ($LASTEXITCODE -ne 0) {
    throw "mysql.exe báo lỗi (mã $LASTEXITCODE). Database chưa được tạo xong; xem thông báo lỗi ở trên."
}

Write-Host ''
Write-Host 'Xong: đã có database quiz_study, quiz_study_test và user quiz_app@localhost.'
Write-Host 'Kiểm tra: cd backend; .\mvnw.cmd verify'
