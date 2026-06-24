[CmdletBinding()]
param(
  [string]$SourceDatabaseUrl = $env:SOURCE_DB_URL,
  [string]$TargetDatabaseUrl = $env:TARGET_DB_URL,
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $PSScriptRoot '..\..\railway-migration-artifacts\verification'
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

if ([string]::IsNullOrWhiteSpace($SourceDatabaseUrl)) {
  throw 'Set SOURCE_DB_URL to the Supabase direct/session-pooler URL.'
}
if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  throw 'Set TARGET_DB_URL to the Railway public PostgreSQL URL.'
}
if ($SourceDatabaseUrl -eq $TargetDatabaseUrl) {
  throw 'SOURCE_DB_URL and TARGET_DB_URL must point to different databases.'
}

$psql = Resolve-PostgresTool -Name 'psql'
$queryPath = Join-Path $PSScriptRoot 'verification.sql'
$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null

$sourceOutput = Join-Path $resolvedOutputDirectory 'supabase.csv'
$targetOutput = Join-Path $resolvedOutputDirectory 'railway.csv'

& $psql $SourceDatabaseUrl -X --csv --set=ON_ERROR_STOP=1 --file=$queryPath --output=$sourceOutput
if ($LASTEXITCODE -ne 0) {
  throw "Supabase verification failed with exit code $LASTEXITCODE."
}

& $psql $TargetDatabaseUrl -X --csv --set=ON_ERROR_STOP=1 --file=$queryPath --output=$targetOutput
if ($LASTEXITCODE -ne 0) {
  throw "Railway verification failed with exit code $LASTEXITCODE."
}

$differences = Compare-Object `
  (Get-Content -LiteralPath $sourceOutput) `
  (Get-Content -LiteralPath $targetOutput)

if ($differences) {
  Write-Host 'Database verification found differences:' -ForegroundColor Red
  $differences | Format-Table -AutoSize
  throw "Supabase and Railway verification results differ. See $resolvedOutputDirectory."
}

Write-Host 'Database verification passed: counts, integrity checks, and required indexes match.'
