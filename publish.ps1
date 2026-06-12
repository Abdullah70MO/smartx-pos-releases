$remoteUrl = git remote get-url origin
$tokenMatch = [regex]::Match($remoteUrl, 'https://(.+?)@')
if ($tokenMatch.Success) {
  $env:GH_TOKEN = $tokenMatch.Groups[1].Value
  Write-Host "✅ تم استخراج GH_TOKEN من git remote" -ForegroundColor Green
} else {
  Write-Host "❌ ما لقيتش GH_TOKEN في git remote. شوف الـ token" -ForegroundColor Red
  exit 1
}

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

$unpackedDir = "build-out\win-unpacked"
$setupExe = "build-out\SMART X POS Setup $newVersion.exe"

if ((Test-Path $unpackedDir) -or (Test-Path $setupExe)) {
  Write-Host "⚠️ الـ build موجود مسبقاً، بينشر من غير ما يبني تاني..." -ForegroundColor Yellow
  node scripts/obfuscate.js obfuscate
  vite build
  if (Test-Path $unpackedDir) {
    npx electron-builder build --win --publish always --prepackaged $unpackedDir
  } else {
    npx electron-builder build --win --publish always
  }
  node scripts/obfuscate.js restore
} else {
  Write-Host "جاري البناء والنشر..." -ForegroundColor Cyan
  npm run publish
}
Write-Host "════════════════════════════════════" -ForegroundColor Cyan

if ($LASTEXITCODE -eq 0) {
  Write-Host "════════════════════════════════════" -ForegroundColor Green
  Write-Host "✅ تم بناء ونشر الإصدار $newVersion بنجاح" -ForegroundColor Green
  Write-Host "════════════════════════════════════" -ForegroundColor Green
  Write-Host ""
  Write-Host "جاري رفع التعديلات والـ tag إلى GitHub..." -ForegroundColor Cyan
  git add package.json
  $changed = git status --porcelain
  if ($changed) {
    git commit -m "v$newVersion"
  } else {
    git commit --allow-empty -m "v$newVersion"
  }
  $tagName = "v$newVersion"
  $tagExists = git tag -l $tagName
  if ($tagExists) {
    git tag -d $tagName
    git push origin ":$tagName" --quiet 2>$null
  }
  git tag $tagName
  git push
  git push origin $tagName -f
  Write-Host "✅ تم رفع الإصدار $newVersion إلى GitHub" -ForegroundColor Green
} else {
  Write-Host "❌ فشل البناء. راجع الأخطاء أعلاه." -ForegroundColor Red
}
