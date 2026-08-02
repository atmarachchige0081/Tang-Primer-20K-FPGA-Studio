[CmdletBinding()]
param(
    [string[]] $Only = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$studio = Join-Path $workspace 'studio'
$outputDirectory = Join-Path $workspace 'docs\images'
$port = 4173
$baseUrl = "http://127.0.0.1:$port"

$edgeCandidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $edge) {
    throw 'Microsoft Edge is required to capture the real Studio 2 interface.'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm.cmd is required. Install Node.js, then run npm install in studio\.'
}

$views = @(
    @{ Capture = 'welcome';       Theme = 'dark';  File = 'studio-main.png' },
    @{ Capture = 'welcome';       Theme = 'light'; File = 'studio-main-light.png' },
    @{ Capture = 'release-notes'; Theme = 'dark';  File = 'studio-release-notes.png' },
    @{ Capture = 'dashboard';     Theme = 'dark';  File = 'studio-insights.png' },
    @{ Capture = 'launcher';      Theme = 'dark';  File = 'studio-command-palette.png' },
    @{ Capture = 'waveform';      Theme = 'dark';  File = 'studio-waveform.png' },
    @{ Capture = 'netlist';       Theme = 'dark';  File = 'studio-netlist-viewer.png' },
    @{ Capture = 'hardware';      Theme = 'dark';  File = 'studio-hardware-setup.png' },
    @{ Capture = 'uart';          Theme = 'dark';  File = 'studio-uart-terminal.png' }
)
if ($Only.Count -gt 0) {
    $views = @($views | Where-Object { $Only -contains $_.Capture })
    if ($views.Count -eq 0) {
        throw "No Studio 2 screenshot matched -Only: $($Only -join ', ')"
    }
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$profileDirectory = Join-Path ([IO.Path]::GetTempPath()) ("fpga-studio-capture-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $profileDirectory | Out-Null
$server = $null

try {
    $server = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', "$port", '--strictPort') -WorkingDirectory $studio -WindowStyle Hidden -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    do {
        if ($server.HasExited) { throw "The Studio preview server exited with code $($server.ExitCode)." }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $baseUrl -TimeoutSec 2
            $ready = $response.StatusCode -eq 200
        } catch {
            $ready = $false
            Start-Sleep -Milliseconds 250
        }
    } until ($ready -or [DateTime]::UtcNow -ge $deadline)
    if (-not $ready) { throw 'Timed out waiting for the Studio 2 preview server.' }

    foreach ($view in $views) {
        $target = Join-Path $outputDirectory $view.File
        $url = "$baseUrl/?capture=$($view.Capture)&theme=$($view.Theme)"
        $viewProfile = Join-Path $profileDirectory ("$($view.Capture)-$($view.Theme)")
        New-Item -ItemType Directory -Path $viewProfile | Out-Null
        $arguments = @(
            '--headless=new',
            '--disable-gpu',
            '--hide-scrollbars',
            '--force-device-scale-factor=1',
            '--window-size=1440,900',
            '--run-all-compositor-stages-before-draw',
            '--virtual-time-budget=3500',
            "--user-data-dir=`"$viewProfile`"",
            "--screenshot=`"$target`"",
            "`"$url`""
        )
        $captureProcess = Start-Process -FilePath $edge -ArgumentList $arguments -WindowStyle Hidden -PassThru
        if (-not $captureProcess.WaitForExit(45000)) {
            Stop-Process -Id $captureProcess.Id -Force -ErrorAction SilentlyContinue
            throw "Timed out capturing the Studio 2 '$($view.Capture)' view."
        }
        if ($captureProcess.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $target -PathType Leaf)) {
            throw "Failed to capture the Studio 2 '$($view.Capture)' view."
        }
        $size = (Get-Item -LiteralPath $target).Length
        if ($size -lt 10KB) { throw "The '$($view.Capture)' screenshot is unexpectedly small ($size bytes)." }
        Write-Host "Captured Studio 2 $($view.Capture) [$($view.Theme)]: $target" -ForegroundColor Green
    }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $profileDirectory) {
        $resolvedProfile = [IO.Path]::GetFullPath($profileDirectory)
        $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
        if ($resolvedProfile.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
