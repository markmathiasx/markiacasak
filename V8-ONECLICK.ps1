#requires -Version 7.0
[CmdletBinding()]
param(
  [string]$Target='C:\Users\markkk\Documents\aaa\skynet-dashboard\SKYNET-V8-LUCIFER-v8.9.0',
  [switch]$NoBrowser
)
$ErrorActionPreference='Stop'
$Kit=Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host 'SKYNET V8 LUCIFER 8.9.0 - ONE CLICK (CORRIGIDO)' -ForegroundColor Green
& (Join-Path $Kit 'INSTALL-UPDATE-SKYNET-V8.ps1') -Target $Target -NoBrowser:$NoBrowser
