$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SMART X - إصدار جديد (GitHub Actions)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "الإصدار الحالي: $currentVersion" -ForegroundColor Yellow
$newVersion = Read-Host "أدخل رقم الإصدار الجديد (مثل 1.0.3)"

if (-not $newVersion) {
  Write-Host "❌ لم يتم إدخال رقم إصدار. إلغاء." -ForegroundColor Red
  exit 1
}

$confirm = Read-Host "هل أنت متأكد من إصدار $newVersion؟ (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
  Write-Host "❌ تم الإلغاء." -ForegroundColor Red
  exit 0
}

$packageContent = Get-Content "package.json" -Raw
$packageContent = $packageContent -replace '"version": "' + [regex]::Escape($currentVersion) + '"', '"version": "' + $newVersion + '"'
Set-Content "package.json" -Value $packageContent -NoNewline

Write-Host "✅ تم تحديث الإصدار إلى $newVersion في package.json" -ForegroundColor Green
Write-Host "جاري الرفع إلى GitHub..." -ForegroundColor Cyan

git add package.json
git commit -m "v$newVersion"
git tag "v$newVersion"
git push
git push --tags

Write-Host "════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ تم رفع الإصدار $newVersion إلى GitHub" -ForegroundColor Green
Write-Host "GitHub Actions سيبني وينشر التحديث تلقائياً" -ForegroundColor Cyan
Write-Host "تتبع进度: https://github.com/Abdullah70MO/smartx-pos/actions" -ForegroundColor Cyan
