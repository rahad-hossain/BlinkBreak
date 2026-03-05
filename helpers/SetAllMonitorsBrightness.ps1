# Manages brightness across all connected monitors using Windows APIs
# Combines WMI for built-in displays and DXVA2 for external DDC/CI monitors
param(
    [Parameter(Mandatory=$true)]
    [int]$Brightness
)

$successCount = 0
$totalMonitors = 0

# Apply brightness via WMI for supported monitors
try {
    $wmiMonitors = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue
    if ($wmiMonitors) {
        foreach ($monitor in $wmiMonitors) {
            try {
                $monitor.WmiSetBrightness(1, $Brightness) | Out-Null
                Write-Host "WMI: Set brightness to $Brightness% on monitor"
                $successCount++
            } catch {
                Write-Host "WMI: Failed on monitor"
            }
        }
    }
} catch {
    Write-Host "WMI: Not available"
}

# Define Windows API structures and functions for DXVA2
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class MonitorAPI {
    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, ref uint pdwNumberOfPhysicalMonitors);

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, uint dwPhysicalMonitorArraySize, [Out] PHYSICAL_MONITOR[] pPhysicalMonitorArray);

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool SetMonitorBrightness(IntPtr hMonitor, uint dwNewBrightness);

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetMonitorBrightness(IntPtr hMonitor, ref uint pdwMinimumBrightness, ref uint pdwCurrentBrightness, ref uint pdwMaximumBrightness);

    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool DestroyPhysicalMonitor(IntPtr hMonitor);

    [DllImport("user32.dll")]
    public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumDelegate lpfnEnum, IntPtr dwData);

    public delegate bool MonitorEnumDelegate(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct PHYSICAL_MONITOR {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string szPhysicalMonitorDescription;
    }
}
"@

$monitors = New-Object System.Collections.ArrayList
$callback = {
    param($hMonitor, $hdcMonitor, $lprcMonitor, $dwData)
    
    $numMonitors = 0
    [MonitorAPI]::GetNumberOfPhysicalMonitorsFromHMONITOR($hMonitor, [ref]$numMonitors) | Out-Null
    
    if ($numMonitors -gt 0) {
        $physicalMonitors = New-Object MonitorAPI+PHYSICAL_MONITOR[] $numMonitors
        [MonitorAPI]::GetPhysicalMonitorsFromHMONITOR($hMonitor, $numMonitors, $physicalMonitors) | Out-Null
        
        foreach ($monitor in $physicalMonitors) {
            $monitors.Add($monitor) | Out-Null
        }
    }
    
    return $true
}

# Enumerate all physical monitors
[MonitorAPI]::EnumDisplayMonitors([IntPtr]::Zero, [IntPtr]::Zero, $callback, [IntPtr]::Zero) | Out-Null

$totalMonitors = $monitors.Count
Write-Host "DXVA2: Found $totalMonitors physical monitors"

# Apply brightness to each monitor via DXVA2
foreach ($monitor in $monitors) {
    try {
        $min = 0
        $current = 0
        $max = 0
        $canGetBrightness = [MonitorAPI]::GetMonitorBrightness($monitor.hPhysicalMonitor, [ref]$min, [ref]$current, [ref]$max)
        
        if ($canGetBrightness) {
            if ([MonitorAPI]::SetMonitorBrightness($monitor.hPhysicalMonitor, $Brightness)) {
                Write-Host "DXVA2: Set brightness to $Brightness% on: $($monitor.szPhysicalMonitorDescription)"
                $successCount++
            } else {
                Write-Host "DXVA2: SetMonitorBrightness failed on: $($monitor.szPhysicalMonitorDescription)"
            }
        } else {
            Write-Host "DXVA2: Monitor does not support brightness control: $($monitor.szPhysicalMonitorDescription)"
        }
    } catch {
        Write-Host "DXVA2: Exception on: $($monitor.szPhysicalMonitorDescription) - $($_.Exception.Message)"
    }
    
    [MonitorAPI]::DestroyPhysicalMonitor($monitor.hPhysicalMonitor) | Out-Null
}

Write-Host "SUCCESS: Applied to $successCount out of $totalMonitors monitors"
