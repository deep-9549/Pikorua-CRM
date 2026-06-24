[CmdletBinding()]
param(
  [string]$SourceDatabaseUrl = $env:SOURCE_DB_URL,
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $PSScriptRoot '..\..\railway-migration-artifacts\pikorua-railway-data.dump'
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
  throw 'Set SOURCE_DB_URL to the Supabase direct/session-pooler URL on port 5432.'
}

$sourceUri = [Uri]$SourceDatabaseUrl
if ($sourceUri.Port -eq 6543) {
  throw 'Do not use the Supabase transaction pooler on port 6543. Use port 5432.'
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$pgDump = Resolve-PostgresTool -Name 'pg_dump'
& $pgDump `
  --dbname=$SourceDatabaseUrl `
  --format=custom `
  --data-only `
  --schema=public `
  --no-owner `
  --no-privileges `
  --file=$resolvedOutput

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE."
}

Write-Host "Supabase data exported to $resolvedOutput"
Write-Host 'This file contains production CRM data. Do not commit or share it.'
