#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Автонастройка раздачи Happ VPN по Wi-Fi на Windows 10/11.

.DESCRIPTION
    1. Включает пересылку IP и правила брандмауэра для Happ
    2. Запускает мобильный хот-спот
    3. Настраивает ICS: TUN/sing-box -> Wi-Fi Direct (раздача через VPN)

    Перед запуском: откройте Happ, подключитесь к серверу, включите TUN.
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Write-Ok([string]$Text) {
    Write-Host "    OK: $Text" -ForegroundColor Green
}

function Write-Warn([string]$Text) {
    Write-Host "    ! $Text" -ForegroundColor Yellow
}

function Write-Err([string]$Text) {
    Write-Host "    X $Text" -ForegroundColor Red
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Enable-IpForwarding {
    Write-Step "Включаю пересылку IP..."
    Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.ConnectionState -eq "Connected" } |
        ForEach-Object {
            Set-NetIPInterface -InterfaceIndex $_.InterfaceIndex -Forwarding Enabled -ErrorAction SilentlyContinue
        }
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "IPEnableRouter" -Value 1 -Force
    Write-Ok "Пересылка IP включена"
}

function Enable-FirewallRules {
    Write-Step "Настраиваю брандмауэр для Happ..."

    $happPaths = @(
        "${env:ProgramFiles}\Happ\Happ.exe",
        "${env:ProgramFiles(x86)}\Happ\Happ.exe",
        "${env:LocalAppData}\Programs\Happ\Happ.exe"
    ) | Where-Object { Test-Path $_ }

    foreach ($path in $happPaths) {
        $name = "Happ VPN Share ($([IO.Path]::GetFileName($path)))"
        if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Program $path -Profile Any | Out-Null
        }
        Write-Ok "Разрешён входящий трафик: $path"
    }

    foreach ($port in @(10808, 10809)) {
        $ruleName = "Happ LAN port $port"
        if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
        }
        Write-Ok "Открыт TCP-порт $port (LAN proxy)"
    }

    $icsRule = "Happ ICS SharedAccess"
    if (-not (Get-NetFirewallRule -DisplayName $icsRule -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $icsRule -Direction Inbound -Action Allow -Service SharedAccess -Profile Any | Out-Null
    }
    Write-Ok "Служба ICS (SharedAccess) разрешена в брандмауэре"
}

function Start-SharedAccessService {
    Write-Step "Запускаю службу общего доступа (ICS)..."
    Set-Service -Name SharedAccess -StartupType Manual -ErrorAction SilentlyContinue
    if ((Get-Service SharedAccess).Status -ne "Running") {
        Start-Service SharedAccess
    }
    Write-Ok "Служба SharedAccess запущена"
}

function Find-VpnAdapter {
    $patterns = @("sing-box", "wintun", "happ", "tun", "tap-windows", "wireguard")
    $adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }

    foreach ($pattern in $patterns) {
        $match = $adapters | Where-Object { $_.InterfaceDescription -match $pattern -or $_.Name -match $pattern } | Select-Object -First 1
        if ($match) { return $match }
    }

    return $null
}

function Find-HotspotAdapter {
    $adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }
    $match = $adapters | Where-Object {
        $_.InterfaceDescription -match "Wi-Fi Direct|Microsoft Wi-Fi Direct|Hosted Network"
    } | Select-Object -First 1

    if ($match) { return $match }

    return $adapters | Where-Object { $_.Name -match "Локальная сеть\*|Local Area Connection\*" } | Select-Object -First 1
}

function Start-MobileHotspot {
    Write-Step "Включаю мобильный хот-спот..."

    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop

        $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
            $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and
            $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
        })[0]

        function Await($WinRtTask, $ResultType) {
            $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
            $netTask = $asTask.Invoke($null, @($WinRtTask))
            $netTask.Wait(-1) | Out-Null
            return $netTask.Result
        }

        [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType=WindowsRuntime] | Out-Null
        [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType=WindowsRuntime] | Out-Null

        $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
        if (-not $profile) {
            Write-Warn "Не удалось получить профиль интернета — включите хот-спот вручную в Параметрах Windows"
            return $false
        }

        $manager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)
        if ($manager.TetheringOperationalState -eq [Windows.Networking.NetworkOperators.TetheringOperationalState]::On) {
            Write-Ok "Мобильный хот-спот уже включён"
            return $true
        }

        $result = Await ($manager.StartTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
        if ($result.Status -eq [Windows.Networking.NetworkOperators.TetheringOperationResultStatus]::Success) {
            Write-Ok "Мобильный хот-спот включён"
            return $true
        }

        Write-Warn "Не удалось включить хот-спот автоматически: $($result.Status)"
        Write-Warn "Включите вручную: Параметры -> Сеть и интернет -> Мобильный хот-спот"
        return $false
    }
    catch {
        Write-Warn "Автовключение хот-спота недоступно на этой системе: $($_.Exception.Message)"
        Write-Warn "Включите хот-спот вручную, затем запустите скрипт снова"
        return $false
    }
}

function Disable-IcsOnAll {
    try {
        $netShare = New-Object -ComObject HNetCfg.HNetShare
        foreach ($connection in @($netShare.EnumEveryConnection)) {
            $config = $netShare.INetSharingConfigurationForINetConnection($connection)
            if ($config.SharingEnabled) {
                $config.DisableSharing()
            }
        }
    }
    catch {
        # ignore
    }
}

function Enable-Ics([string]$PublicAdapterName, [string]$PrivateAdapterName) {
    Write-Step "Настраиваю ICS: VPN -> Wi-Fi (раздача через Happ)..."

    $netShare = New-Object -ComObject HNetCfg.HNetShare
    $publicConfig = $null
    $privateConfig = $null

    foreach ($connection in @($netShare.EnumEveryConnection)) {
        $props = $netShare.NetConnectionProps($connection)
        if (-not $props) { continue }

        if ($props.Name -eq $PublicAdapterName) {
            $publicConfig = $netShare.INetSharingConfigurationForINetConnection($connection)
        }
        if ($props.Name -eq $PrivateAdapterName) {
            $privateConfig = $netShare.INetSharingConfigurationForINetConnection($connection)
        }
    }

    if (-not $publicConfig) {
        throw "Не найден VPN-адаптер '$PublicAdapterName' в списке подключений Windows"
    }
    if (-not $privateConfig) {
        throw "Не найден адаптер хот-спота '$PrivateAdapterName'. Сначала включите мобильный хот-спот"
    }

    Disable-IcsOnAll

    # 0 = PUBLIC (источник интернета / VPN), 1 = PRIVATE (раздача на другие устройства)
    $publicConfig.EnableSharing(0)
    Start-Sleep -Seconds 2
    $privateConfig.EnableSharing(1)

    Write-Ok "ICS настроен: [$PublicAdapterName] -> [$PrivateAdapterName]"
}

function Show-Result {
    param(
        [string]$VpnName,
        [string]$HotspotName
    )

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  РАЗДАЧА VPN НАСТРОЕНА" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "VPN-адаптер:     $VpnName"
    Write-Host "Хот-спот:        $HotspotName"
    Write-Host ""
    Write-Host "Подключите телефон к Wi-Fi сети вашего ПК."
    Write-Host "Проверка IP:     https://2ip.ru"
    Write-Host ""
    Write-Host "Если интернет на телефоне не через VPN:"
    Write-Host "  1. Убедитесь, что Happ подключён и TUN включён"
    Write-Host "  2. В Happ: Настройки -> Allow LAN Connections -> Вкл."
    Write-Host "  3. Запустите этот скрипт снова"
    Write-Host ""
}

# --- MAIN ---

Clear-Host
Write-Host "Happ VPN -> Wi-Fi: автонастройка" -ForegroundColor White
Write-Host "---------------------------------" -ForegroundColor DarkGray

if (-not (Test-Admin)) {
    Write-Err "Запустите скрипт от имени администратора"
    exit 1
}

$vpn = Find-VpnAdapter
if (-not $vpn) {
    Write-Err "VPN-адаптер не найден."
    Write-Host ""
    Write-Host "Сделайте сначала:" -ForegroundColor Yellow
    Write-Host "  1. Запустите Happ от имени администратора"
    Write-Host "  2. Подключитесь к серверу"
    Write-Host "  3. Включите TUN (как на вашем скриншоте)"
    Write-Host "  4. Запустите этот скрипт снова"
    exit 1
}

Write-Ok "Найден VPN-адаптер: $($vpn.Name) [$($vpn.InterfaceDescription)]"

Enable-IpForwarding
Enable-FirewallRules
Start-SharedAccessService

$hotspotStarted = Start-MobileHotspot
Start-Sleep -Seconds 3

$hotspot = Find-HotspotAdapter
if (-not $hotspot) {
    Write-Err "Адаптер Wi-Fi Direct (хот-спот) не найден."
    if (-not $hotspotStarted) {
        Write-Host "Включите мобильный хот-спот в Параметрах Windows и запустите скрипт снова." -ForegroundColor Yellow
    }
    exit 1
}

Write-Ok "Найден адаптер хот-спота: $($hotspot.Name) [$($hotspot.InterfaceDescription)]"

try {
    Enable-Ics -PublicAdapterName $vpn.Name -PrivateAdapterName $hotspot.Name
    Show-Result -VpnName $vpn.Name -HotspotName $hotspot.Name
    exit 0
}
catch {
    Write-Err $_.Exception.Message
    Write-Host ""
    Write-Host "Ручная настройка (если скрипт не смог):" -ForegroundColor Yellow
    Write-Host "  Win+R -> ncpa.cpl"
    Write-Host "  ПКМ по '$($vpn.Name)' -> Свойства -> Доступ"
    Write-Host "  Разрешить другим пользователям... -> выбрать '$($hotspot.Name)'"
    exit 1
}
