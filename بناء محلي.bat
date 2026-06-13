@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -Command "
  $packageJson = Get-Content 'package.json' -Raw | ConvertFrom-Json;
  $currentVersion = $packageJson.version;
  Write-Host '════════════════════════════════════' -ForegroundColor Cyan;
  Write-Host '  SMART X - بناء محلي' -ForegroundColor Cyan;
  Write-Host '════════════════════════════════════' -ForegroundColor Cyan;
  Write-Host 'الإصدار الحالي: ' -NoNewline -ForegroundColor Yellow; Write-Host $currentVersion -ForegroundColor White;
  $newVersion = Read-Host 'أدخل رقم الإصدار (مثل 1.0.3)';
  if (-not $newVersion) { Write-Host '❌ لم يتم إدخال رقم إصدار.' -ForegroundColor Red; exit 1; };
  $confirm = Read-Host 'هل أنت متأكد من بناء ''''$newVersion''''؟ (y/n)';
  if ($confirm -ne 'y' -and $confirm -ne 'Y') { Write-Host '❌ تم الإلغاء.' -ForegroundColor Red; exit 0; };
  $content = Get-Content 'package.json' -Raw;
  $content = $content -replace '\"version\": \"' + [regex]::Escape($currentVersion) + '\"', '\"version\": \"' + $newVersion + '\"';
  Set-Content 'package.json' -Value $content -NoNewline;
  Write-Host '`n✅ تم تحديث الإصدار إلى ' -NoNewline -ForegroundColor Green; Write-Host $newVersion -NoNewline -ForegroundColor White; Write-Host ' في package.json' -ForegroundColor Green;
  Write-Host '`nجاري البناء المحلي...' -ForegroundColor Cyan;
  npm run build:win;
  if ($LASTEXITCODE -eq 0) { Write-Host '`n════════════════════════════════════' -ForegroundColor Green; Write-Host '✅ تم بناء الإصدار ' -NoNewline -ForegroundColor Green; Write-Host $newVersion -NoNewline -ForegroundColor White; Write-Host ' محلياً' -ForegroundColor Green; Write-Host 'الملف: build-out\SMART X POS Setup ' -NoNewline -ForegroundColor Cyan; Write-Host $newVersion -NoNewline -ForegroundColor White; Write-Host '.exe' -ForegroundColor Cyan; } else { Write-Host '`n❌ فشل البناء.' -ForegroundColor Red; };
"
pause
