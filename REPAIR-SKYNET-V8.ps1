#requires -Version 7.0
[CmdletBinding()]
param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$Project=Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Project 'scripts\common.ps1')
Set-Location $Project
Write-Banner 'SKYNET V8 LUCIFER - REPAIR 8.9.0' Green
Stop-ProjectProcesses $Project
Assert-PortFree 3000 $Project
Assert-PortFree 5173 $Project
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js ausente' }
if (!(Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm ausente' }
# Keep a healthy node_modules intact; this avoids needless destructive reinstalls.
& npm.cmd ls --depth=0 *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Dependencias incompletas. Reinstalando com npm ci...' -ForegroundColor Yellow
  & npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou; confira internet/registry e log npm' }
}
& node --check .\server.cjs
if ($LASTEXITCODE -ne 0) { throw 'server.cjs invalido' }
& node --check .\tests.cjs
if ($LASTEXITCODE -ne 0) { throw 'tests.cjs invalido' }
& npm.cmd run test:all
if ($LASTEXITCODE -ne 0) { throw 'testes falharam; nao iniciar' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'build falhou; nao iniciar' }
& (Join-Path $Project 'START-SKYNET-V8.ps1') -SkipTests -NoBrowser:$NoBrowser
if (!$?) { throw 'Inicializacao falhou' }
Write-Host '[OK] Testes, build, backend, frontend, proxy, fila e websocket validados.' -ForegroundColor Green
