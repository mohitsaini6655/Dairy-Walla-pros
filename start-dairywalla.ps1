$ErrorActionPreference = "Stop"

Write-Host "Preparing network-safe environment..." -ForegroundColor Cyan

# Clear broken proxy variables for this session
Remove-Item Env:HTTP_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:ALL_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:GIT_HTTP_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:GIT_HTTPS_PROXY -ErrorAction SilentlyContinue
$env:NO_PROXY = "localhost,127.0.0.1,::1,ivlfbqcaxmbudxuxfcyl.supabase.co"

Set-Location "E:\Dairy Walla Kiro\dairy-setu"

Write-Host "Starting DairyWalla dev server..." -ForegroundColor Green
npm run dev
