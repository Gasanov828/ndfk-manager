@echo off
chcp 65001 >nul
title Happ VPN - раздача по Wi-Fi

echo.
echo  ========================================
echo   Настройка раздачи Happ VPN по Wi-Fi
echo  ========================================
echo.
echo  Перед запуском:
echo    1. Откройте Happ и ПОДКЛЮЧИТЕСЬ к серверу
echo    2. TUN должен быть ВКЛ (как у вас в настройках)
echo.
pause

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-happ-vpn-wifi-share.ps1"

echo.
pause
