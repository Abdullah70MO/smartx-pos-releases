$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SMART X - بناء ونشر إصدار جديد" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "الإصدار الحالي: $currentVersion" -ForegroundColor Yellow
$newVersion = Read-Host "أدخل رقم الإصدار الجديد (مثل 1.0.3)"

if (-not $newVersion) {
  Write-Host "❌ لم يتم إدخال رقم إصدار. إلغاء." -ForegroundColor Red
  exit 1
}

$confirm = Read-Host "هل أنت متأكد من نشر الإصدار $newVersion؟ (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
  Write-Host "❌ تم الإلغاء." -ForegroundColor Red
  exit 0
}

$packageContent = Get-Content "package.json" -Raw
$packageContent = $packageContent -replace '"version": "' + [regex]::Escape($currentVersion) + '"', '"version": "' + $newVersion + '"'
Set-Content "package.json" -Value $packageContent -NoNewline

Write-Host "✅ تم تحديث الإصدار إلى $newVersion في package.json" -ForegroundColor Green
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "جاري البناء والنشر..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan

npm run publish

if ($LASTEXITCODE -eq 0) {
  Write-Host "════════════════════════════════════" -ForegroundColor Green
  Write-Host "✅ تم بناء ونشر الإصدار $newVersion بنجاح" -ForegroundColor Green
  Write-Host "════════════════════════════════════" -ForegroundColor Green
  Write-Host ""
  Write-Host "📌 لا تنس عمل commit و push للتغيير:" -ForegroundColor Yellow
  Write-Host "   git add package.json" -ForegroundColor White
  Write-Host "   git commit -m ""v$newVersion""" -ForegroundColor White
  Write-Host "   git tag v$newVersion" -ForegroundColor White
  Write-Host "   git push && git push --tags" -ForegroundColor White
} else {
  Write-Host "❌ فشل البناء. راجع الأخطاء أعلاه." -ForegroundColor Red
}
