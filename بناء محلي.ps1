$p = Join-Path $PSScriptRoot "package.json"
$j = Get-Content $p -Raw | ConvertFrom-Json
$v = $j.version

Write-Host ("=" * 40) -ForegroundColor Cyan
Write-Host "  SMART X - BUILD LOCAL" -ForegroundColor Cyan
Write-Host ("=" * 40) -ForegroundColor Cyan
Write-Host "Current version: " -NoNewline -ForegroundColor Yellow
Write-Host $v -ForegroundColor White

$n = Read-Host "Enter new version (e.g. 1.1.4, or press Enter to keep $v)"
if (-not $n) { $n = $v; Write-Host "Keeping $v" -ForegroundColor Yellow }
$c = Read-Host "Build $n? (y/n)"
if ($c -ne 'y' -and $c -ne 'Y') { Write-Host "Cancelled." -ForegroundColor Red; exit 0 }

if ($n -ne $v) {
  $content = Get-Content $p -Raw
  $content = $content -replace ('"version": "' + [regex]::Escape($v) + '"'), ('"version": "' + $n + '"')
  Set-Content $p -Value $content -NoNewline
  Write-Host "Updated to $n" -ForegroundColor Green
}

Write-Host "Building..." -ForegroundColor Cyan

# Use cmd to run npm (handles && properly)
cmd /c "npm run build:win"
if ($LASTEXITCODE -eq 0) {
  Write-Host ("=" * 40) -ForegroundColor Green
  Write-Host "DONE: $n" -ForegroundColor Green
  $exe = Join-Path $PSScriptRoot "build-out" | Join-Path -ChildPath "SMART X POS Setup $n.exe"
  Write-Host $exe -ForegroundColor Cyan
  Write-Host ("=" * 40) -ForegroundColor Green
} else {
  Write-Host "FAILED" -ForegroundColor Red
}
Read-Host "Press Enter to exit"
