#requires -Version 7.0
[CmdletBinding()]
param([string]$Backup='')
$ErrorActionPreference='Stop'
$Project=Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Project 'scripts\common.ps1')
if (!$Backup) {
  $candidate=Get-ChildItem (Join-Path $Project 'backups') -Directory -Filter 'cura-definitiva-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
  if (!$candidate) {throw 'Backup cura-definitiva ausente.'}
  $Backup=$candidate.FullName
}
$map=Join-Path $Backup 'restore-map.json'
if (!(Test-Path $map)) { throw "Backup sem restore-map.json: $Backup" }
$data=Get-Content $map -Raw | ConvertFrom-Json
if (![IO.Path]::GetFullPath($data.target).TrimEnd('\').Equals([IO.Path]::GetFullPath($Project).TrimEnd('\'),[StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backup pertence a outro diretorio de projeto.'
}
Stop-ProjectProcesses $Project
foreach ($rel in $data.created) {Remove-Item -LiteralPath (Join-Path $Project $rel) -Force -ErrorAction SilentlyContinue}
foreach ($rel in $data.updated) {
  $src=Join-Path $Backup $rel; $dst=Join-Path $Project $rel
  if (!(Test-Path $src)) {throw "Backup incompleto: $src"}
  New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Force
}
Write-Host "[OK] Arquivos restaurados do backup $Backup" -ForegroundColor Green
Write-Host 'Para reconstruir dependencias execute npm ci, se o lockfile anterior for diferente.' -ForegroundColor Yellow
