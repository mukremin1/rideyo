# RideYo ödeme altyapısı deploy
# Kullanım:
#   1) npx supabase login   (bir kez, tarayıcıda onayla)
#   2) .\scripts\deploy-payment.ps1
#
# veya token ile:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\deploy-payment.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "SUPABASE_ACCESS_TOKEN yok. Once: npx supabase login" -ForegroundColor Yellow
  npx supabase login
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "`n=== Migration + Functions deploy ===" -ForegroundColor Cyan
node scripts/deploy-payment.mjs

Write-Host "`n=== Opsiyonel: iyzico sandbox secrets ===" -ForegroundColor Cyan
Write-Host @"
npx supabase secrets set `
  IYZICO_API_KEY=sandbox-XXX `
  IYZICO_SECRET_KEY=sandbox-XXX `
  IYZICO_SANDBOX=true `
  APP_URL=http://localhost:5173 `
  IYZICO_CALLBACK_BASE_URL=https://ucjnonpozhzuyjuowwdx.supabase.co/functions/v1/payment-callback `
  PLATFORM_COMMISSION_RATE=0.15
"@
