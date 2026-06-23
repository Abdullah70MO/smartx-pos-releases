Write-Host "=== 1. قتل أي عمليات قديمة ==="
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "vite" } | Stop-Process -Force
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

Write-Host "=== 2. بدء Vite ==="
$vite = Start-Process -NoNewWindow -PassThru powershell "-NoLogo -NoProfile -Command npx vite --port 5173" -WorkingDirectory "$PSScriptRoot"
Start-Sleep 5

Write-Host "=== 3. اختبار اتصال Vite ==="
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    Write-Host "Vite شغال على http://localhost:5173 (StatusCode: $($response.StatusCode))"
} catch {
    Write-Host "Vite مش شغال! الخطأ: $_"
    $vite.Kill()
    exit 1
}

Write-Host "=== 4. بدء Electron ==="
$env:ELECTRON_RENDERER_URL = "http://localhost:5173"
$electron = Start-Process -NoNewWindow -PassThru powershell "-NoLogo -NoProfile -Command npx electron ." -WorkingDirectory "$PSScriptRoot"
Start-Sleep 10

if ($electron.HasExited) {
    Write-Host "Electron انتهى فجأة! Exit code: $($electron.ExitCode)"
} else {
    Write-Host "Electron شغال (PID: $($electron.Id))"
}

Write-Host ""
Write-Host "التطبيق شغال. اضغط Enter لإيقاف كل حاجة"
Read-Host
$vite.Kill()
$electron.Kill()
