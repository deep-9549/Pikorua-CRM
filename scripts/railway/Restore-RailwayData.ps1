[CmdletBinding()]
param(
  [string]$TargetDatabaseUrl = $env:TARGET_DB_URL,
  [string]$DumpPath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DumpPath)) {
  $DumpPath = Join-Path $PSScriptRoot '..\..\railway-migration-artifacts\pikorua-railway-data.dump'
}

function Resolve-PostgresTool {
  param([Parameter(Mandatory)][string]$Name)

  $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = Get-ChildItem 'C:\Program Files\PostgreSQL' -Filter "$Name.exe" -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending
  if ($candidates) {
    return $candidates[0].FullName
  }

  throw "$Name.exe was not found. Install PostgreSQL client tools or add them to PATH."
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  throw 'Set TARGET_DB_URL to the Railway public PostgreSQL URL.'
}

$resolvedDump = [System.IO.Path]::GetFullPath($DumpPath)
if (-not (Test-Path -LiteralPath $resolvedDump -PathType Leaf)) {
  throw "Dump file not found: $resolvedDump"
}

$pgRestore = Resolve-PostgresTool -Name 'pg_restore'
& $pgRestore `
  --dbname=$TargetDatabaseUrl `
  --data-only `
  --no-owner `
  --no-privileges `
  --exit-on-error `
  --single-transaction `
  $resolvedDump

if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with exit code $LASTEXITCODE. The transaction was rolled back."
}

Write-Host 'Railway data restore completed successfully.'
