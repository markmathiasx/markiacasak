#requires -Version 7.0
[CmdletBinding()]
param(
  [string]$Target='C:\Users\markkk\Documents\aaa\skynet-dashboard\SKYNET-V8-LUCIFER-v8.9.0',
  [switch]$NoStart,
  [switch]$NoBrowser,
  [switch]$ForceInstall
)
$ErrorActionPreference='Stop'
$Kit=Split-Path -Parent $MyInvocation.MyCommand.Path
# Installer uses the exact same verified, backup-first process as external recovery.
& (Join-Path $Kit 'CURA-DEFINITIVA-SKYNET.ps1') -Target $Target -SourceFolder $Kit `
  -NoStart:$NoStart -NoBrowser:$NoBrowser -ForceInstall:$ForceInstall
