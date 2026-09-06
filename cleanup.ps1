# Football Manager — безопасная очистка мусора
# Удаляет только то, что пересобирается автоматически (кэш сборки, логи, temp).
# Исходный код НЕ трогает. node_modules удаляется только с флагом -Full.
#
# Использование:
#   powershell -ExecutionPolicy Bypass -File .\cleanup.ps1
#   powershell -ExecutionPolicy Bypass -File .\cleanup.ps1 -Full   (+ node_modules, потом нужно npm install)

param(
    [switch]$Full
)

$ErrorActionPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

function Remove-IfExists($path) {
    if (Test-Path $path) {
        $size = (Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum).Sum
        $sizeMb = [math]::Round($size / 1MB, 1)
        Remove-Item $path -Recurse -Force
        Write-Host "  Удалено: $path ($sizeMb МБ)" -ForegroundColor Green
    } else {
        Write-Host "  Пропущено (нет): $path" -ForegroundColor DarkGray
    }
}

Write-Host "`n=== Кэш сборки и временные файлы ===" -ForegroundColor Cyan
Remove-IfExists ".next"
Remove-IfExists ".tmp"
Remove-IfExists "supabase\.temp"
Remove-IfExists "tsconfig.tsbuildinfo"
Remove-IfExists ".vercel-cli"

Write-Host "`n=== Логи ===" -ForegroundColor Cyan
Get-ChildItem -Path . -Filter "*.log" -File | ForEach-Object { Remove-IfExists $_.FullName }
Get-ChildItem -Path . -Filter "*.err.log" -File | ForEach-Object { Remove-IfExists $_.FullName }
Get-ChildItem -Path . -Filter "*.pid" -File | ForEach-Object { Remove-IfExists $_.FullName }

Write-Host "`n=== Патч-файл (уже применён, если использовался) ===" -ForegroundColor Cyan
Remove-IfExists "sr-route.patch"

if ($Full) {
    Write-Host "`n=== ПОЛНАЯ очистка: node_modules ===" -ForegroundColor Yellow
    Write-Host "  После этого потребуется 'npm install' перед запуском проекта." -ForegroundColor Yellow
    Remove-IfExists "node_modules"
    Remove-IfExists "android-app\node_modules"
}

Write-Host "`nГотово. Ничего из исходного кода не тронуто." -ForegroundColor Cyan
if (-not $Full) {
    Write-Host "Для удаления node_modules (потом нужен npm install) запусти: .\cleanup.ps1 -Full" -ForegroundColor DarkGray
}
