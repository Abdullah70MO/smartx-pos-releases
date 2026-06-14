$p = Join-Path $PSScriptRoot "package.json"
$j = Get-Content $p -Raw | ConvertFrom-Json
$v = $j.version

Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host "     SMART X - BUILD & RELEASE" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host "Current version: " -NoNewline -ForegroundColor Yellow
Write-Host $v -ForegroundColor White

$n = Read-Host "Enter new version (e.g. 1.1.5, or press Enter to keep $v)"
if (-not $n) { $n = $v; Write-Host "Keeping $v" -ForegroundColor Yellow }

# Confirm with user
Write-Host "`nWill build version $n" -ForegroundColor Cyan
$c = Read-Host "Continue? (y/n)"
if ($c -ne 'y' -and $c -ne 'Y') { Write-Host "Cancelled." -ForegroundColor Red; exit 0 }

# Bump version in package.json
if ($n -ne $v) {
  $content = Get-Content $p -Raw
  $content = $content -replace ('"version": "' + [regex]::Escape($v) + '"'), ('"version": "' + $n + '"')
  Set-Content $p -Value $content -NoNewline
  Write-Host "Version updated to $n" -ForegroundColor Green
}

# Run build
Write-Host "`nBuilding..." -ForegroundColor Cyan
cmd /c "npm run build:win"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed!" -ForegroundColor Red
  exit 1
}

# Ensure source files are restored (obfuscate.js restore might not work)
Write-Host "`nRestoring source files..." -ForegroundColor Cyan
node scripts/obfuscate.js restore 2>$null
# Check if still obfuscated and use git checkout as fallback
$check = Select-String -Path "src/main/ipc/license.js" -Pattern "require\('node:crypto'\)" -SimpleMatch -Quiet
if (-not $check) {
  Write-Host "Restore incomplete, using git checkout..." -ForegroundColor Yellow
  git checkout -- "src/main/ipc/license.js" 2>$null
  git checkout -- "src/main/constants.js" 2>$null
  git checkout -- "src/main/database.js" 2>$null
  Write-Host "Source files restored from git" -ForegroundColor Green
}

# Extract GH_TOKEN from git remote
$remoteUrl = git remote get-url origin
$token = ($remoteUrl -split '@')[0] -replace 'https://', ''
$headers = @{ Authorization = "token $token"; Accept = "application/vnd.github.v3+json" }

Write-Host "`nCreating GitHub release for v$n on public repo..." -ForegroundColor Cyan

# Create release
$releaseBody = @{
  tag_name = "v$n"
  name = "v$n"
  body = "SMART X POS v$n"
  prerelease = $false
} | ConvertTo-Json
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/Abdullah70MO/smartx-pos-releases/releases" -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
$releaseId = $release.id
Write-Host "Release created: v$n (ID: $releaseId)" -ForegroundColor Green

# Upload blockmap (exe excluded - user uploads manually)
$blockmapSrc = Join-Path $PSScriptRoot "build-out" | Join-Path -ChildPath "SMART X POS Setup $n.exe.blockmap"
if (Test-Path $blockmapSrc) {
  $blockmapName = "SMART-X-POS-Setup-$n.exe.blockmap"
  $uploadUrl = "https://uploads.github.com/repos/Abdullah70MO/smartx-pos-releases/releases/$releaseId/assets?name=$blockmapName"
  $bytes = [System.IO.File]::ReadAllBytes($blockmapSrc)
  Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -ContentType "application/octet-stream" -Body $bytes | Out-Null
  Write-Host "  Uploaded: $blockmapName" -ForegroundColor Green
} else {
  Write-Host "  WARNING: blockmap not found at $blockmapSrc" -ForegroundColor Yellow
}

# Upload latest.yml
$ymlSrc = Join-Path $PSScriptRoot "build-out\latest.yml"
if (Test-Path $ymlSrc) {
  $ymlUrl = "https://uploads.github.com/repos/Abdullah70MO/smartx-pos-releases/releases/$releaseId/assets?name=latest.yml"
  $bytes = [System.IO.File]::ReadAllBytes($ymlSrc)
  Invoke-RestMethod -Uri $ymlUrl -Method Post -Headers $headers -ContentType "application/octet-stream" -Body $bytes | Out-Null
  Write-Host "  Uploaded: latest.yml" -ForegroundColor Green
} else {
  Write-Host "  WARNING: latest.yml not found" -ForegroundColor Yellow
}

Write-Host "`nRelease URL: https://github.com/Abdullah70MO/smartx-pos-releases/releases/tag/v$n" -ForegroundColor Cyan

# Commit and push version bump
Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
git add package.json
git commit -m "Bump version to $n"
git push origin master
if ($?) { git push public master }

# Done
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "  DONE: v$n" -ForegroundColor Green
$exePath = Join-Path $PSScriptRoot "build-out" | Join-Path -ChildPath "SMART X POS Setup $n.exe"
Write-Host "  Build: $exePath" -ForegroundColor Cyan
Write-Host "  Release: https://github.com/Abdullah70MO/smartx-pos-releases/releases/tag/v$n" -ForegroundColor Cyan
Write-Host "  " -NoNewline
Write-Host "IMPORTANT: Upload the .exe manually to the release!" -ForegroundColor Yellow
Write-Host ("=" * 50) -ForegroundColor Green

Read-Host "Press Enter to exit"
