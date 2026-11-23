#requires -Version 7.0
$Project=Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Project 'scripts\common.ps1')
Stop-ProjectProcesses $Project
Write-Host 'Encerramento solicitado para os processos deste checkout.' -ForegroundColor Green
foreach ($port in (Get-LocalPort $env:SKYNET_LOCAL_CORE_PORT 39188),(Get-LocalPort $env:SKYNET_LOCAL_UI_PORT 5173)) {
  $owner = Get-PortOwner $port
  if ($owner) { Write-Warning "Porta $port ainda ocupada (PID $($owner.PID))." }
}

