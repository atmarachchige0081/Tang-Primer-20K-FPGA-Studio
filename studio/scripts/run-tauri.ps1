[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('dev', 'build', 'check')]
    [string] $Mode = 'dev'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$StudioRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$CargoExecutable = Get-Command cargo.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty Source
if (-not $CargoExecutable) {
    $UserCargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
    if (Test-Path -LiteralPath $UserCargo -PathType Leaf) {
        $CargoExecutable = $UserCargo
    }
}
if (-not $CargoExecutable) {
    throw @'
Rust Cargo was not found. Install the stable MSVC Rust toolchain from https://rustup.rs,
then close and reopen PowerShell. FPGA Studio also checks %USERPROFILE%\.cargo\bin automatically.
'@
}

$CargoDirectory = Split-Path -Parent $CargoExecutable
$PathEntries = @($env:Path -split ';' | Where-Object { $_ })
if ($PathEntries -notcontains $CargoDirectory) {
    $env:Path = "$CargoDirectory;$env:Path"
}

$TauriExecutable = Join-Path $StudioRoot 'node_modules\.bin\tauri.cmd'
if (-not (Test-Path -LiteralPath $TauriExecutable -PathType Leaf)) {
    throw "Tauri dependencies are missing. Run 'npm install' once inside '$StudioRoot'."
}

Push-Location $StudioRoot
try {
    if ($Mode -eq 'check') {
        & $CargoExecutable metadata --manifest-path 'src-tauri\Cargo.toml' --no-deps --format-version 1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Cargo metadata failed with exit code $LASTEXITCODE."
        }
        Write-Host "Desktop prerequisites are ready. Cargo: $CargoExecutable" -ForegroundColor Green
        exit 0
    }
    & $TauriExecutable $Mode
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
