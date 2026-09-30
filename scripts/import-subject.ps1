<#
.SYNOPSIS
    Import một môn vào database dev từ file JSON đã sinh: database/seed/<slug>/generated/import.json

.DESCRIPTION
    Chạy backend một lần với tham số --import (không mở web server, tự thoát khi xong).
    Backend kiểm tra toàn bộ file trước khi ghi; có lỗi thì không ghi gì và liệt kê mọi lỗi.
    Môn đã có trong database: thêm -Replace để thay toàn bộ bài và câu hỏi của môn đó.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\import-subject.ps1 -Slug gdqp

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\import-subject.ps1 -Slug gdqp -Replace
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')]
    [string]$Slug,

    [switch]$Replace
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$importFile = Join-Path $projectRoot "database\seed\$Slug\generated\import.json"

if (-not (Test-Path $importFile)) {
    throw "Chưa có file $importFile. Hãy chạy script trích xuất của môn này trước (xem scripts\README.md)."
}
# Maven tách các tham số của ứng dụng bằng dấu cách, nên đường dẫn có dấu cách sẽ bị cắt đôi.
if ($importFile -match '\s') {
    throw "Đường dẫn project có dấu cách ($projectRoot); lệnh import chưa hỗ trợ trường hợp này."
}

# Không chạy web server (ứng dụng tự thoát sau khi import) và tắt log từng câu SQL của profile dev.
$arguments = @('--spring.main.web-application-type=none', '--logging.level.org.hibernate.SQL=info', "--import=$importFile")
if ($Replace) {
    $arguments += '--replace'
}

Push-Location (Join-Path $projectRoot 'backend')
try {
    & .\mvnw.cmd -q spring-boot:run "-Dspring-boot.run.arguments=$($arguments -join ' ')"
    if ($LASTEXITCODE -ne 0) {
        throw "Import thất bại (mã $LASTEXITCODE). Xem thông báo lỗi ở trên; database không bị thay đổi."
    }
} finally {
    Pop-Location
}
