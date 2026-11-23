#requires -Version 7.0
[CmdletBinding()]
param([string]$Backup='', [switch]$DryRun)
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
$created = @(foreach ($rel in $data.created) {
  $dst = Resolve-ProjectChild $Project $rel
  if (Test-Path -LiteralPath $dst -PathType Container) { throw "O mapa aponta para uma pasta: $dst" }
  $dst
})
$updated = @(foreach ($rel in $data.updated) {
  $src = Resolve-ProjectChild $Backup $rel
  $dst = Resolve-ProjectChild $Project $rel
  if (!(Test-Path -LiteralPath $src -PathType Leaf)) { throw "Backup incompleto: $src" }
  if ((Test-Path -LiteralPath $dst -PathType Container) -or $dst -in $created) { throw "Destino invalido: $dst" }
  @{ Source=$src; Destination=$dst }
})
if ($DryRun) {
  Write-Host "Mapa valido. Arquivos a restaurar: $($updated.Count). Arquivos a remover: $($created.Count)."
  return
}
Stop-ProjectProcesses $Project
foreach ($entry in $updated) {
  New-Item -ItemType Directory -Force -Path (Split-Path $entry.Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $entry.Source -Destination $entry.Destination -Force
}
foreach ($dst in $created) {
  if (Test-Path -LiteralPath $dst -PathType Leaf) { Remove-Item -LiteralPath $dst -Force }
}
Write-Host "[OK] Arquivos restaurados do backup $Backup" -ForegroundColor Green
Write-Host 'Para reconstruir dependencias execute npm ci, se o lockfile anterior for diferente.' -ForegroundColor Yellow
