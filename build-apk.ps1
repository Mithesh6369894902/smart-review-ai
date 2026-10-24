# SmartReviewAI - Build Android APK
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$web = Join-Path $root "web"
$android = Join-Path $web "android"

# Clean previous APK files
$oldRootApk = Join-Path $root "SmartReviewAI.apk"
if (Test-Path $oldRootApk) { Remove-Item $oldRootApk -Force }
$oldGradleApk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $oldGradleApk) { Remove-Item $oldGradleApk -Force }

Write-Host "Building web app..." -ForegroundColor Cyan
Set-Location $web
npm run build
npx cap sync android

Write-Host "Building APK..." -ForegroundColor Cyan
Set-Location $android
.\gradlew.bat assembleDebug

$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  $out = Join-Path $root "SmartReviewAI.apk"
  Copy-Item $apk $out -Force
  Write-Host "APK ready: $out" -ForegroundColor Green
} else {
  Write-Host "Build finished but APK not found. Open the android folder in Android Studio and Build > Build APK." -ForegroundColor Yellow
}
