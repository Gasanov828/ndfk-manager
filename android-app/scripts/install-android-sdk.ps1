$ErrorActionPreference = "Stop"

$sdkRoot = "$env:LOCALAPPDATA\Android\Sdk"
$cmdlineDir = Join-Path $sdkRoot "cmdline-tools\latest"
$zipPath = Join-Path $env:TEMP "android-cmdline-tools.zip"
$url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

Write-Host "Android SDK root: $sdkRoot"

if (-not (Test-Path (Join-Path $sdkRoot "platform-tools\adb.exe"))) {
  Write-Host "Downloading Android command-line tools..."
  Invoke-WebRequest -Uri $url -OutFile $zipPath

  $extractRoot = Join-Path $env:TEMP "android-cmdline-tools"
  if (Test-Path $extractRoot) {
    Remove-Item $extractRoot -Recurse -Force
  }
  Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force

  New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineDir -Parent) | Out-Null
  if (Test-Path $cmdlineDir) {
    Remove-Item $cmdlineDir -Recurse -Force
  }
  Move-Item (Join-Path $extractRoot "cmdline-tools") $cmdlineDir

  $sdkmanager = Join-Path $cmdlineDir "bin\sdkmanager.bat"
  Write-Host "Installing SDK packages (may take a few minutes)..."
  cmd /c "echo y| `"$sdkmanager`" --sdk_root=`"$sdkRoot`" `"platform-tools`" `"platforms;android-35`" `"build-tools;35.0.0`""
}

if (-not (Test-Path (Join-Path $sdkRoot "platform-tools\adb.exe"))) {
  Write-Host "SDK install failed."
  exit 1
}

Write-Host "Android SDK ready at $sdkRoot"
