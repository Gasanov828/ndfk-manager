#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

function Find-VpnAdapter {
    $patterns = @("sing-box", "wintun", "happ", "tun", "tap-windows", "wireguard")
    $adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }
    foreach ($pattern in $patterns) {
        $match = $adapters | Where-Object {
            $_.InterfaceDescription -match $pattern -or $_.Name -match $pattern
        } | Select-Object -First 1
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
    return $adapters | Where-Object { $_.Name -match "Local Area Connection\*" } | Select-Object -First 1
}

function Stop-MobileHotspot {
    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
        $profile = [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType=WindowsRuntime]::GetInternetConnectionProfile()
        if (-not $profile) { return }
        $manager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType=WindowsRuntime]::CreateFromConnectionProfile($profile)
        if ($manager.TetheringOperationalState -eq [Windows.Networking.NetworkOperators.TetheringOperationalState]::On) {
            $task = $manager.StopTetheringAsync()
            $task.AsTask().GetAwaiter().GetResult() | Out-Null
            Start-Sleep -Seconds 2
        }
    } catch { }
}

function Start-MobileHotspot {
    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
        $profile = [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType=WindowsRuntime]::GetInternetConnectionProfile()
        if (-not $profile) { return $false }
        $manager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType=WindowsRuntime]::CreateFromConnectionProfile($profile)
        if ($manager.TetheringOperationalState -ne [Windows.Networking.NetworkOperators.TetheringOperationalState]::On) {
            $task = $manager.StartTetheringAsync()
            $task.AsTask().GetAwaiter().GetResult() | Out-Null
        }
        return $true
    } catch {
        return $false
    }
}

function Clear-IcsWmi {
    try {
        $scope = New-Object System.Management.ManagementScope("\\.\ROOT\Microsoft\HomeNet")
        $scope.Connect()
        $query = New-Object System.Management.ObjectQuery("SELECT * FROM HNet_ConnectionProperties")
        $searcher = New-Object System.Management.ManagementObjectSearcher($scope, $query)
        foreach ($m in $searcher.Get()) {
            try {
                $m["IsIcsPublic"] = $false
                $m["IsIcsPrivate"] = $false
                $m.Put() | Out-Null
            } catch { }
        }
    } catch { }
}

function Disable-IcsOnAll {
    try {
        $netShare = New-Object -ComObject HNetCfg.HNetShare
        foreach ($connection in @($netShare.EnumEveryConnection)) {
            $config = $netShare.INetSharingConfigurationForINetConnection($connection)
            if ($config.SharingEnabled) { $config.DisableSharing() }
        }
    } catch { }
}

function Enable-Ics([string]$PublicAdapterName, [string]$PrivateAdapterName) {
    Stop-Service SharedAccess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Service SharedAccess -ErrorAction SilentlyContinue
    Clear-IcsWmi
    Disable-IcsOnAll
    Start-Sleep -Seconds 1

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
    if (-not $publicConfig) { throw "VPN adapter not found: $PublicAdapterName" }
    if (-not $privateConfig) { throw "Hotspot adapter not found: $PrivateAdapterName" }

    try {
        $publicConfig.EnableSharing(0)
        Start-Sleep -Seconds 2
        $privateConfig.EnableSharing(1)
    } catch {
        Clear-IcsWmi
        Disable-IcsOnAll
        Start-Sleep -Seconds 1
        $privateConfig.EnableSharing(1)
        Start-Sleep -Seconds 2
        $publicConfig.EnableSharing(0)
    }
}

Clear-Host
Write-Host "Happ VPN -> Wi-Fi setup" -ForegroundColor White

$vpn = Find-VpnAdapter
if (-not $vpn) {
    Write-Host "ERROR: VPN adapter not found." -ForegroundColor Red
    Write-Host "1. Run Happ as Administrator" -ForegroundColor Yellow
    Write-Host "2. Connect to server" -ForegroundColor Yellow
    Write-Host "3. Enable TUN" -ForegroundColor Yellow
    Write-Host "4. Run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host "VPN adapter: $($vpn.Name)" -ForegroundColor Green

Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.ConnectionState -eq "Connected" } |
    ForEach-Object { Set-NetIPInterface -InterfaceIndex $_.InterfaceIndex -Forwarding Enabled -ErrorAction SilentlyContinue }

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "IPEnableRouter" -Value 1 -Force

foreach ($port in @(10808, 10809)) {
    $ruleName = "Happ LAN port $port"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
    }
}

Set-Service -Name SharedAccess -StartupType Manual -ErrorAction SilentlyContinue
if ((Get-Service SharedAccess).Status -ne "Running") { Start-Service SharedAccess }

Write-Host "Stopping hotspot for ICS setup..." -ForegroundColor Yellow
Stop-MobileHotspot
Start-Sleep -Seconds 2

$hotspot = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
    $_.InterfaceDescription -match "Wi-Fi Direct|Microsoft Wi-Fi Direct|Hosted Network" -or
    $_.Name -match "Local Area Connection\*|Подключение по локальной сети\*"
} | Select-Object -First 1

if (-not $hotspot) {
    Write-Host "Hotspot adapter not visible yet. Turn ON Mobile Hotspot once in Settings, then run again." -ForegroundColor Yellow
    if (Start-MobileHotspot) {
        Start-Sleep -Seconds 3
        $hotspot = Find-HotspotAdapter
    }
}

if (-not $hotspot) {
    Write-Host "ERROR: Wi-Fi Direct adapter not found. Enable Mobile Hotspot first." -ForegroundColor Red
    exit 1
}

Write-Host "Hotspot adapter: $($hotspot.Name)" -ForegroundColor Green

try {
    Enable-Ics -PublicAdapterName $vpn.Name -PrivateAdapterName $hotspot.Name
    Write-Host "ICS configured." -ForegroundColor Green
} catch {
    Write-Host "ICS auto failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "DO THIS MANUALLY (30 sec):" -ForegroundColor Yellow
    Write-Host "1. Win+R -> ncpa.cpl -> Enter" -ForegroundColor Yellow
    Write-Host "2. Right-click '$($vpn.Name)' -> Properties -> Sharing tab" -ForegroundColor Yellow
    Write-Host "3. Check 'Allow other network users...'" -ForegroundColor Yellow
    Write-Host "4. Select '$($hotspot.Name)' in dropdown -> OK" -ForegroundColor Yellow
    Write-Host ""
    Start-Process "ncpa.cpl"
}

Write-Host "Starting mobile hotspot..." -ForegroundColor Yellow
if (Start-MobileHotspot) {
    Write-Host "Mobile hotspot: ON" -ForegroundColor Green
} else {
    Write-Host "Turn ON Mobile Hotspot in Windows Settings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "DONE! Connect phone to PC Wi-Fi. Check: https://2ip.ru" -ForegroundColor Green
