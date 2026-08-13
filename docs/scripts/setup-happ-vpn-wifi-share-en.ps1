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
    Disable-IcsOnAll
    $publicConfig.EnableSharing(0)
    Start-Sleep -Seconds 2
    $privateConfig.EnableSharing(1)
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

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
    $profile = [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType=WindowsRuntime]::GetInternetConnectionProfile()
    if ($profile) {
        $manager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType=WindowsRuntime]::CreateFromConnectionProfile($profile)
        if ($manager.TetheringOperationalState -ne [Windows.Networking.NetworkOperators.TetheringOperationalState]::On) {
            $task = $manager.StartTetheringAsync()
            $task.AsTask().GetAwaiter().GetResult() | Out-Null
        }
        Write-Host "Mobile hotspot: ON" -ForegroundColor Green
    }
} catch {
    Write-Host "Enable Mobile Hotspot manually in Windows Settings" -ForegroundColor Yellow
}

Start-Sleep -Seconds 3

$hotspot = Find-HotspotAdapter
if (-not $hotspot) {
    Write-Host "ERROR: Wi-Fi Direct adapter not found. Enable Mobile Hotspot first." -ForegroundColor Red
    exit 1
}

Write-Host "Hotspot adapter: $($hotspot.Name)" -ForegroundColor Green

try {
    Enable-Ics -PublicAdapterName $vpn.Name -PrivateAdapterName $hotspot.Name
    Write-Host ""
    Write-Host "DONE! VPN is shared via Wi-Fi." -ForegroundColor Green
    Write-Host "Connect phone to PC hotspot. Check: https://2ip.ru" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Manual fix: Win+R -> ncpa.cpl -> VPN adapter -> Sharing tab" -ForegroundColor Yellow
    exit 1
}
