Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host "  SMART X - BACKUP SOURCE TO PRIVATE REPO" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan

# Show current status
Write-Host "`nCurrent changes:" -ForegroundColor Yellow
git status --short

$msg = Read-Host "`nEnter commit message (or press Enter to cancel)"
if (-not $msg) { Write-Host "Cancelled." -ForegroundColor Red; exit 0 }

Write-Host "`nCommitting..." -ForegroundColor Cyan
git add -A
git commit -m $msg
if ($LASTEXITCODE -ne 0) {
  Write-Host "Commit failed (maybe nothing to commit?)" -ForegroundColor Red
  exit 1
}

Write-Host "Pushing to private repo (origin)..." -ForegroundColor Cyan
git push origin master

Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "  DONE - Source backed up to private repo" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green

Read-Host "Press Enter to exit"
