#requires -Version 7.0
$Project=Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Project 'scripts\common.ps1')
Stop-ProjectProcesses $Project
Write-Host 'SKYNET V8 Revival encerrado.' -ForegroundColor Green
