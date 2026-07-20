$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Find-JavaHome {
  $patterns = @(
    "$env:USERPROFILE\.jdks\microsoft-jdk-21",
    "C:\Program Files\Microsoft\jdk-21*",
    "C:\Program Files\Microsoft\jdk-17*",
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Java\jdk-17*"
  )

  foreach ($pattern in $patterns) {
    $resolved = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($resolved -and (Test-Path (Join-Path $resolved.FullName "bin\java.exe"))) {
      return $resolved.FullName
    }
  }

  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    return $env:JAVA_HOME
  }

  $java = Get-Command java -ErrorAction SilentlyContinue
  if ($java) {
    return (Split-Path (Split-Path $java.Source -Parent) -Parent)
  }

  return $null
}

function Find-AndroidSdk {
  $candidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path (Join-Path $candidate "platform-tools\adb.exe"))) {
      return $candidate
    }
  }

  return $null
}

Write-Host "Sync Capacitor..."
npm install --silent
npx cap sync android

$javaHome = Find-JavaHome
if (-not $javaHome) {
  Write-Host "Java JDK 17 not found. Install Microsoft.OpenJDK.17 and retry."
  exit 1
}

$env:JAVA_HOME = $javaHome
Write-Host "JAVA_HOME=$javaHome"

$sdk = Find-AndroidSdk
if (-not $sdk) {
  Write-Host ""
  Write-Host "Android SDK not found."
  Write-Host "Install Android Studio: https://developer.android.com/studio"
  Write-Host "Then run again: npm run build:apk"
  Write-Host "Or open in Android Studio: npm run open"
  exit 2
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
Write-Host "ANDROID_HOME=$sdk"

Write-Host "Building debug APK..."
Set-Location (Join-Path $root "android")
.\gradlew.bat assembleDebug

$apk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  $out = Join-Path $root "ndfk-manager-debug.apk"
  Copy-Item $apk $out -Force
  Write-Host ""
  Write-Host "Done: $out"
} else {
  Write-Host "APK file was not produced."
  exit 3
}
