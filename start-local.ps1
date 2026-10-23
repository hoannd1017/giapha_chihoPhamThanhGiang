# Script one-click d? ch?y Gia Ph? OS local (Next.js + Supabase)
# Ch?y file này ? thu m?c g?c repo: .\start-local.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "=== Gia Ph? OS - Start Local Web ===" -ForegroundColor Cyan
Write-Host "Thu m?c làm vi?c: $root" -ForegroundColor Gray

# 1. Ki?m tra Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js chua du?c cài d?t. Vui lòng cài t?i https://nodejs.org/" -ForegroundColor Red
  exit 1
}
Write-Host "Node: $(node --version)" -ForegroundColor Green

# 2. T?o .env.local n?u chua có
if (-not (Test-Path ".env.local")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local"
    Write-Host "Ðã t?o .env.local t? .env.example" -ForegroundColor Green
    Write-Host "C?p nh?t NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY trong .env.local tru?c khi ch?y!" -ForegroundColor Yellow
  } else {
    Write-Host "Không tìm th?y .env.example" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "File .env.local dã t?n t?i" -ForegroundColor Green
}

# 3. Cài d?t dependencies
Write-Host "Ðang cài d?t dependencies..." -ForegroundColor Cyan
if (Test-Path "package-lock.json") {
  npm ci --no-audit --no-fund
} else {
  npm i --no-audit --no-fund
}
Write-Host "Dependencies dã s?n sàng" -ForegroundColor Green

# 4. M? trình duy?t và ch?y dev
Write-Host ""
Write-Host "Kh?i d?ng server dev t?i http://localhost:3000" -ForegroundColor Cyan
Write-Host "Nh?n Ctrl+C d? d?ng server" -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:3000"
npx --yes next dev --port 3000
