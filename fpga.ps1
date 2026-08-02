[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'setup', 'driver', 'doctor', 'lint', 'sim', 'wave', 'debug', 'build', 'upload', 'flash', 'detect', 'serial', 'clean')]
    [string] $Command = 'help',

    [string] $Project = '.',
    [string] $Port,
    [ValidateRange(300, 4000000)]
    [int] $Baud = 115200,
    [string] $Testbench,
    [ValidatePattern('^[A-Za-z_]\w*$')]
    [string] $TestbenchTop = 'tb_top',
    [string] $WaveLayout,
    [switch] $NoBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$WorkspaceRoot = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$projectCandidate = if ([IO.Path]::IsPathRooted($Project)) {
    $Project
} else {
    Join-Path $WorkspaceRoot $Project
}
$ProjectRoot = [IO.Path]::GetFullPath($projectCandidate).TrimEnd('\')
if ($ProjectRoot -ne $WorkspaceRoot -and
    -not $ProjectRoot.StartsWith($WorkspaceRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Project must be inside the workspace: $ProjectRoot"
}
if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    throw "Project directory does not exist: $ProjectRoot"
}
$ConfigPath = Join-Path $ProjectRoot 'fpga.config.psd1'
if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Project configuration is missing: $ConfigPath"
}
$Config = Import-PowerShellDataFile -LiteralPath $ConfigPath
$BuildDir = Join-Path $ProjectRoot 'build'

function Write-Usage {
    @'
Tang Primer 20K FPGA commands

  .\fpga.ps1 setup                 Install the pinned OSS CAD Suite
  .\fpga.ps1 driver                Open the JTAG-only WinUSB installer
  .\fpga.ps1 doctor                Check tools and attached USB devices
  .\fpga.ps1 lint                  Lint all RTL with Verilator
  .\fpga.ps1 sim                   Run the self-checking Icarus simulation
  .\fpga.ps1 wave                  Simulate and open GTKWave
  .\fpga.ps1 debug                 Lint, simulate, then open GTKWave
  .\fpga.ps1 build                 Synthesize, place/route, and pack top.fs
  .\fpga.ps1 upload                Build and load SRAM (volatile)
  .\fpga.ps1 flash                 Build and program flash (persistent)
  .\fpga.ps1 detect                Detect the JTAG chain
  .\fpga.ps1 serial -Port COM5     Open the UART monitor (Ctrl+C to exit)
  .\fpga.ps1 clean                 Remove generated build files

Add -NoBuild to upload/flash to reuse build/top.fs.
Use -Testbench sim/tb_name.sv -TestbenchTop tb_name to select one testbench.
Use -WaveLayout sim/name.gtkw with wave/debug to select a GTKWave layout.
Use -Project projects/<folder> to run a project from the workspace root.
'@ | Write-Host
}

function Initialize-Toolchain {
    $toolchainRoot = if ($env:OSS_CAD_SUITE_ROOT) {
        $env:OSS_CAD_SUITE_ROOT
    } else {
        $Config.ToolchainRoot
    }

    $environmentScript = Join-Path $toolchainRoot 'environment.ps1'
    if (-not (Test-Path -LiteralPath $environmentScript)) {
        throw "OSS CAD Suite is not installed at '$toolchainRoot'. Run '.\fpga.ps1 setup'."
    }

    # The upstream environment script only initializes YOSYSHQ_ROOT when it is
    # unset, so set it explicitly when a caller selects an override.
    $env:YOSYSHQ_ROOT = "$($toolchainRoot.TrimEnd('\'))\"
    . $environmentScript

    # Yosys/ABC on Windows still splits some temporary paths at spaces. Keep
    # its scratch directory beside the toolchain, outside the spaced user path.
    $toolBase = Split-Path -Parent (Split-Path -Parent $toolchainRoot)
    $fpgaTemp = Join-Path $toolBase 'tmp'
    New-Item -ItemType Directory -Force -Path $fpgaTemp | Out-Null
    $env:TEMP = $fpgaTemp
    $env:TMP = $fpgaTemp
}

function Invoke-NativeTool {
    param(
        [Parameter(Mandatory)] [string] $Executable,
        [Parameter()] [string[]] $ArgumentList = @()
    )

    $displayArgs = $ArgumentList | ForEach-Object {
        if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
    }
    Write-Host ("> {0} {1}" -f $Executable, ($displayArgs -join ' ')) -ForegroundColor DarkGray
    & $Executable @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable failed with exit code $LASTEXITCODE."
    }
}

function Get-RelativeProjectPath {
    param([Parameter(Mandatory)] [string] $Path)
    # Windows PowerShell 5.1 uses .NET Framework, which predates
    # [IO.Path]::GetRelativePath(). All project sources are required to live
    # below the workspace, so a validated prefix removal is sufficient.
    $rootPrefix = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\') + '\'
    $fullPath = [IO.Path]::GetFullPath($Path)
    if (-not $fullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside the project: $fullPath"
    }
    $fullPath.Substring($rootPrefix.Length).Replace('\', '/')
}

function Get-RtlSources {
    $rtlRoot = Join-Path $ProjectRoot 'rtl'
    $sources = @(Get-ChildItem -LiteralPath $rtlRoot -Recurse -File |
        Where-Object { $_.Extension -in @('.v', '.sv') } |
        Sort-Object FullName)
    if ($sources.Count -eq 0) {
        throw "No Verilog/SystemVerilog sources were found under '$rtlRoot'."
    }
    $sources
}

function New-BuildDirectory {
    New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
}

function Invoke-Lint {
    New-BuildDirectory
    $sources = @(Get-RtlSources | ForEach-Object { Get-RelativeProjectPath $_.FullName })
    Invoke-NativeTool 'verilator' (@(
        '--lint-only', '--timing', '-Wall', '-Wno-DECLFILENAME',
        '--top-module', $Config.Top
    ) + $sources)
    Write-Host 'RTL lint passed.' -ForegroundColor Green
}

function Invoke-Simulation {
    New-BuildDirectory
    $rtl = @(Get-RtlSources | ForEach-Object { Get-RelativeProjectPath $_.FullName })
    $testbenches = @(
        if ($Testbench) {
            $candidate = [IO.Path]::GetFullPath((Join-Path $ProjectRoot $Testbench))
            $simulationRoot = [IO.Path]::GetFullPath((Join-Path $ProjectRoot 'sim')).TrimEnd('\') + '\'
            if (-not $candidate.StartsWith($simulationRoot, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Selected testbench must be under sim/: $Testbench"
            }
            if (-not (Test-Path -LiteralPath $candidate -PathType Leaf) -or
                [IO.Path]::GetExtension($candidate) -notin @('.v', '.sv')) {
                throw "Selected testbench does not exist or is not Verilog/SystemVerilog: $Testbench"
            }
            Get-RelativeProjectPath $candidate
        } else {
            Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'sim') -Recurse -File |
                Where-Object { $_.Extension -in @('.v', '.sv') } |
                Sort-Object FullName |
                ForEach-Object { Get-RelativeProjectPath $_.FullName }
        }
    )
    if ($testbenches.Count -eq 0) {
        throw 'No simulation testbench was found under sim/.'
    }

    $simulationOutput = "build/$TestbenchTop.vvp"
    Invoke-NativeTool 'iverilog' (@('-g2012', '-Wall', '-s', $TestbenchTop, '-o', $simulationOutput) + $rtl + $testbenches)
    Invoke-NativeTool 'vvp' @($simulationOutput)
    Write-Host 'Simulation passed; waveform: build/waves.vcd' -ForegroundColor Green
}

function Open-Waveform {
    $waveform = Join-Path $BuildDir 'waves.vcd'
    if (-not (Test-Path -LiteralPath $waveform)) {
        Invoke-Simulation
    }
    $saveRelative = if ($WaveLayout) { $WaveLayout } else { 'sim\waves.gtkw' }
    $saveFile = [IO.Path]::GetFullPath((Join-Path $ProjectRoot $saveRelative))
    $simulationRoot = [IO.Path]::GetFullPath((Join-Path $ProjectRoot 'sim')).TrimEnd('\') + '\'
    if (-not $saveFile.StartsWith($simulationRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Wave layout must be under sim/: $saveRelative"
    }
    $gtkwaveArgs = @('--dump', ('"' + $waveform + '"'))
    if (Test-Path -LiteralPath $saveFile) {
        $gtkwaveArgs += @('--save', ('"' + $saveFile + '"'))
    }
    Start-Process -FilePath (Get-Command 'gtkwave').Source `
        -ArgumentList $gtkwaveArgs -WorkingDirectory $ProjectRoot | Out-Null
    if (Test-Path -LiteralPath $saveFile) {
        Write-Host 'GTKWave opened with the project signal layout and complete simulation timeline.' -ForegroundColor Green
    } else {
        Write-Host 'GTKWave opened. You can also open build/waves.vcd directly in VS Code.' -ForegroundColor Green
    }
}

function Invoke-Build {
    New-BuildDirectory
    $constraintPath = Join-Path $ProjectRoot $Config.Constraint
    if (-not (Test-Path -LiteralPath $constraintPath)) {
        throw "Constraint file is missing: $constraintPath"
    }

    $sourceLines = Get-RtlSources | ForEach-Object {
        $relative = Get-RelativeProjectPath $_.FullName
        "read_verilog -sv `"$relative`""
    }
    $yosysScript = @(
        '# Generated by fpga.ps1; edit fpga.config.psd1 and rtl/ instead.'
        $sourceLines
        "synth_gowin -top $($Config.Top) -family $($Config.YosysFamily) -json build/top.json"
        'stat'
    ) -join [Environment]::NewLine
    [IO.File]::WriteAllText(
        (Join-Path $BuildDir 'synth.ys'),
        $yosysScript + [Environment]::NewLine,
        [Text.UTF8Encoding]::new($false)
    )

    Invoke-NativeTool 'yosys' @('-q', '-l', 'build/yosys.log', '-s', 'build/synth.ys')
    Invoke-NativeTool 'nextpnr-himbaechel' @(
        '--json', 'build/top.json',
        '--write', 'build/top_pnr.json',
        '--device', $Config.Device,
        '--vopt', "family=$($Config.Family)",
        '--vopt', "cst=$($Config.Constraint.Replace('\', '/'))",
        '--freq', [string]$Config.ClockMHz,
        '--report', 'build/timing.json',
        '--detailed-timing-report'
    )
    Invoke-NativeTool 'gowin_pack' @(
        '-d', $Config.Family,
        '-o', $Config.Bitstream,
        'build/top_pnr.json'
    )

    Assert-Bitstream
    $bitstream = Get-Item -LiteralPath (Join-Path $ProjectRoot $Config.Bitstream)
    Write-Host ("Build complete: {0} ({1:N0} bytes)" -f $bitstream.FullName, $bitstream.Length) -ForegroundColor Green
    Write-Host 'Reports: build/yosys.log and build/timing.json'
}

function Assert-Bitstream {
    $bitstream = Join-Path $ProjectRoot $Config.Bitstream
    if (-not (Test-Path -LiteralPath $bitstream)) {
        throw "Bitstream is missing: $bitstream. Run '.\fpga.ps1 build'."
    }
    $item = Get-Item -LiteralPath $bitstream
    if ($item.Length -lt 1024) {
        throw "Bitstream is unexpectedly small ($($item.Length) bytes). Rebuild before programming."
    }
    $lines = [IO.File]::ReadAllLines($item.FullName)
    if ($lines.Count -lt 10) {
        throw 'Bitstream has no complete Gowin FS header. Rebuild before programming.'
    }
    $control = $lines | Where-Object { $_.StartsWith('00010000') } | Select-Object -First 1
    if (-not $control -or $control.Length -ne 64) {
        throw 'Bitstream has no valid Gowin control header. Rebuild before programming.'
    }
    $compressionBit = $control[$control.Length - 1 - 13]
    if ($compressionBit -eq '1') {
        throw 'Compressed Gowin FS files are blocked because this openFPGALoader build cannot safely parse their checksum. Rebuild with the updated FPGA Studio.'
    }
    foreach ($line in $lines) {
        if (-not $line -or ($line.Length % 8) -ne 0 -or $line -notmatch '^[01]+$') {
            throw 'Bitstream contains a truncated or invalid Gowin FS line. Rebuild before programming.'
        }
    }
}

function Invoke-Upload {
    if (-not $NoBuild) { Invoke-Build }
    Assert-Bitstream
    Invoke-NativeTool 'openFPGALoader' @('-b', $Config.ProgrammerBoard, '-m', $Config.Bitstream)
    Write-Host 'Uploaded to FPGA SRAM. This image is lost when power is removed.' -ForegroundColor Green
}

function Invoke-Flash {
    if (-not $NoBuild) { Invoke-Build }
    Assert-Bitstream
    Invoke-NativeTool 'openFPGALoader' @('-b', $Config.ProgrammerBoard, '-f', '--verify', $Config.Bitstream)
    Write-Host 'Programmed and verified persistent flash.' -ForegroundColor Green
}

function Invoke-Detect {
    Invoke-NativeTool 'openFPGALoader' @('-b', $Config.ProgrammerBoard, '--detect')
}

function Open-JtagDriverInstaller {
    if (-not (Test-Path -LiteralPath $Config.DriverTool)) {
        throw "The signed driver helper is missing at '$($Config.DriverTool)'. Run '.\fpga.ps1 setup' first."
    }

    $jtagInterface = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue |
        Where-Object { $_.InstanceId -like 'USB\VID_0403&PID_6010&MI_00\*' } |
        Select-Object -First 1
    if (-not $jtagInterface) {
        throw 'Tang Primer 20K JTAG interface MI_00 is not connected. Connect the Dock JTAG/UART USB-C port first.'
    }

    $signature = Get-AuthenticodeSignature -FilePath $Config.DriverTool
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Akeo Consulting') {
        throw "Refusing to launch $($Config.DriverTool): its Akeo Consulting signature is not valid."
    }

    Write-Host 'Zadig will open and request administrator approval.' -ForegroundColor Cyan
    Write-Host '  1. Choose Options > List All Devices.'
    Write-Host '  2. Select USB Serial Converter A (Interface 0 / MI_00).'
    Write-Host '  3. Select WinUSB, then click Replace Driver.'
    Write-Host 'Do NOT change Converter B / MI_01; it provides the UART COM port.' -ForegroundColor Yellow
    Start-Process -FilePath $Config.DriverTool
    Write-Host "After Zadig finishes, run '.\fpga.ps1 detect'." -ForegroundColor Green
}

function Invoke-Doctor {
    Write-Host 'Project' -ForegroundColor Cyan
    Write-Host "  Root:       $ProjectRoot"
    Write-Host "  Device:     $($Config.Device)"
    Write-Host "  Constraints: $($Config.Constraint)"
    Write-Host "  Toolchain:  $env:YOSYSHQ_ROOT"

    Write-Host "`nTools" -ForegroundColor Cyan
    & yosys -V
    & nextpnr-himbaechel --version
    & openFPGALoader --version
    & iverilog -V 2>&1 | Select-Object -First 1
    & verilator --version

    Write-Host "`nUSB programmer scan" -ForegroundColor Cyan
    $savedErrorPreference = $ErrorActionPreference
    try {
        # openFPGALoader reports inaccessible USB devices on stderr. Capture the
        # diagnostic without PowerShell 5.1 turning it into a terminating error.
        $ErrorActionPreference = 'Continue'
        $scanOutput = @(& openFPGALoader --scan-usb 2>&1)
        $scanExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedErrorPreference
    }
    $scanOutput | ForEach-Object { Write-Host $_ }
    if ($scanExitCode -ne 0) {
        Write-Warning 'USB scan returned an error. Check the debugger USB cable/driver.'
    } elseif ($scanOutput -match "can't open device") {
        Write-Warning "The Dock is connected, but JTAG interface A is not using WinUSB. Run '.\fpga.ps1 driver'."
    } elseif ($scanOutput.Count -le 1) {
        Write-Warning 'No JTAG probe is currently visible. Connect the Dock JTAG/UART USB-C port.'
    }

    Write-Host "`nWindows serial ports" -ForegroundColor Cyan
    $portDevices = @(Get-CimInstance Win32_PnPEntity |
        Where-Object { $_.Name -match '\(COM\d+\)' } |
        Sort-Object Name)
    if ($portDevices.Count -eq 0) {
        Write-Host '  No COM ports detected.'
    } else {
        $portDevices | ForEach-Object { Write-Host "  $($_.Name)" }
    }

    Write-Host "`nBoard checks" -ForegroundColor Cyan
    Write-Host '  Dock: use the USB-C JTAG/UART port and put DIP switch 1 DOWN to enable the core board.'
    Write-Host '  If no programmer appears, update the BL702 debugger firmware and check its Windows driver.'
}

function Open-SerialMonitor {
    if (-not $Port) {
        $ports = @([System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object)
        if ($ports.Count -eq 1) {
            $script:Port = $ports[0]
        } elseif ($ports.Count -eq 0) {
            throw "No COM port was detected. Connect the Dock UART and pass '-Port COMx'."
        } else {
            throw "More than one COM port exists ($($ports -join ', ')). Pass '-Port COMx'."
        }
    }

    $serial = [System.IO.Ports.SerialPort]::new($Port, $Baud, 'None', 8, 'One')
    $serial.ReadTimeout = 200
    try {
        $serial.Open()
        Write-Host "Listening on $Port at $Baud baud. Press Ctrl+C to stop." -ForegroundColor Green
        while ($true) {
            try {
                $text = $serial.ReadExisting()
                if ($text) { Write-Host -NoNewline $text }
                Start-Sleep -Milliseconds 20
            } catch [System.TimeoutException] {
                # Normal while waiting for UART data.
            }
        }
    } finally {
        if ($serial.IsOpen) { $serial.Close() }
        $serial.Dispose()
    }
}

function Clear-BuildDirectory {
    if (-not (Test-Path -LiteralPath $BuildDir)) {
        Write-Host 'Nothing to clean.'
        return
    }
    $resolvedProject = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
    $resolvedBuild = [IO.Path]::GetFullPath($BuildDir).TrimEnd('\')
    if (-not $resolvedBuild.StartsWith($resolvedProject + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a build path outside the project: $resolvedBuild"
    }
    Remove-Item -LiteralPath $resolvedBuild -Recurse -Force
    Write-Host "Removed $resolvedBuild"
}

Push-Location $ProjectRoot
try {
    if ($Command -eq 'help') {
        Write-Usage
        return
    }
    if ($Command -eq 'setup') {
        & (Join-Path $WorkspaceRoot 'scripts/setup-toolchain.ps1')
        return
    }
    if ($Command -eq 'driver') {
        Open-JtagDriverInstaller
        return
    }
    if ($Command -eq 'clean') {
        Clear-BuildDirectory
        return
    }

    Initialize-Toolchain
    switch ($Command) {
        'doctor' { Invoke-Doctor }
        'lint'   { Invoke-Lint }
        'sim'    { Invoke-Simulation }
        'wave'   { Invoke-Simulation; Open-Waveform }
        'debug'  { Invoke-Lint; Invoke-Simulation; Open-Waveform }
        'build'  { Invoke-Build }
        'upload' { Invoke-Upload }
        'flash'  { Invoke-Flash }
        'detect' { Invoke-Detect }
        'serial' { Open-SerialMonitor }
    }
} finally {
    Pop-Location
}
