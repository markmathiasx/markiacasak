#requires -Version 7.0
[CmdletBinding()]
param([switch]$SkipTests, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Project 'scripts\common.ps1')
$Logs = Join-Path $Project 'logs'
$Runtime = Join-Path $Project '.runtime'
$PidFile = Join-Path $Runtime 'pids.json'
New-Item -ItemType Directory -Force -Path $Logs,$Runtime | Out-Null

Write-Banner 'SKYNET V8 LUCIFER 8.9.0 - START / LIVE VALIDATION' Green
$node = Get-Command node -ErrorAction Stop
$null = Get-Command npm -ErrorAction Stop
$vite = Join-Path $Project 'node_modules\vite\bin\vite.js'
Set-Location $Project

if (!(Test-Path (Join-Path $Project 'node_modules\express\package.json'))) {
  & npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou' }
}
if (!(Test-Path $vite)) { throw 'Vite ausente; tente npm ci.' }
if (!$SkipTests) {
  & node --check .\server.cjs
  if ($LASTEXITCODE -ne 0) { throw 'server.cjs invalido' }
  & npm.cmd run test:all
  if ($LASTEXITCODE -ne 0) { throw 'test:all falhou' }
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'build falhou' }
}

Stop-ProjectProcesses $Project
Assert-PortFree 3000 $Project
Assert-PortFree 5173 $Project
$backendOut=Join-Path $Logs 'backend.out.log'
$backendErr=Join-Path $Logs 'backend.err.log'
$frontOut=Join-Path $Logs 'frontend.out.log'
$frontErr=Join-Path $Logs 'frontend.err.log'
Remove-Item $backendOut,$backendErr,$frontOut,$frontErr -Force -ErrorAction SilentlyContinue

try {
  # Use direct node processes, not npm.cmd children, for reliable tracked PIDs.
  $serverFile = Join-Path $Project 'server.cjs'
  $backendArgs = '"' + $serverFile + '" --host 127.0.0.1 --port 3000'
  $backend = Start-Process -FilePath $node.Source -ArgumentList $backendArgs -WorkingDirectory $Project `
    -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -PassThru
  Write-Host "[BACKEND] PID $($backend.Id)" -ForegroundColor Green

  $h=Wait-Json 'http://127.0.0.1:3000/health' 50 $backend.Id
  if (!$h -or $h.service -ne 'skynet-v8-lucifer-core' -or $h.version -ne '8.9.0' -or [int]$h.port -ne 3000) {
    Get-Content $backendOut,$backendErr -Tail 80 -ErrorAction SilentlyContinue
    throw 'Backend nao validado (identidade, versao, porta ou health).'
  }

  $frontendArgs = '"' + $vite + '" --host 127.0.0.1 --port 5173 --strictPort'
  $frontend = Start-Process -FilePath $node.Source -ArgumentList $frontendArgs -WorkingDirectory $Project `
    -RedirectStandardOutput $frontOut -RedirectStandardError $frontErr -PassThru
  Write-Host "[FRONTEND] PID $($frontend.Id)" -ForegroundColor Green

  if (!(Wait-Http 'http://127.0.0.1:5173/' 50)) {
    Get-Content $frontOut,$frontErr -Tail 80 -ErrorAction SilentlyContinue
    throw 'Frontend Vite nao respondeu em 5173.'
  }
  $proxy = Wait-Json 'http://127.0.0.1:5173/health' 25
  if (!$proxy -or $proxy.service -ne 'skynet-v8-lucifer-core' -or [int]$proxy.pid -ne [int]$backend.Id) {
    throw 'Proxy frontend -> backend nao validado.'
  }
  $state = Invoke-RestMethod 'http://127.0.0.1:5173/api/state' -NoProxy -TimeoutSec 5
  if (!$state.ok -or !$state.metrics) { throw 'API state falhou.' }
  $metrics = Invoke-RestMethod 'http://127.0.0.1:5173/api/metrics' -NoProxy -TimeoutSec 5
  if (!$metrics.ok -or !$metrics.metrics) { throw 'API metrics falhou.' }

  & node .\tools\ws-smoke.cjs ws://127.0.0.1:5173/ws
  if ($LASTEXITCODE -ne 0) { throw 'WebSocket smoke falhou.' }

  # Exercise the queue end-to-end through the frontend proxy, using only
  # local synthetic frames; do not contact third-party services.
  $payload = '{"provider":"PGSOFT","vector":"RACE_CONDITION","intensity":3}'
  $queued = Invoke-RestMethod 'http://127.0.0.1:5173/api/operation' -Method Post `
    -ContentType 'application/json' -Body $payload -NoProxy -TimeoutSec 5
  if (!$queued.ok -or !$queued.job.id -or $queued.status -ne 'QUEUED') { throw 'Fila de operacoes falhou.' }
  $found = $null
  foreach ($n in 1..60) {
    $snap = Invoke-RestMethod 'http://127.0.0.1:5173/api/state' -NoProxy -TimeoutSec 5
    $found = @($snap.operations | Where-Object { $_.id -eq $queued.job.id -and $_.status -eq 'DONE' } | Select-Object -First 1)
    if ($found.Count -and [int]$found[0].framesGenerated -eq 3) { break }
    Start-Sleep -Milliseconds 100
  }
  if (!$found.Count -or [int]$found[0].framesGenerated -ne 3) { throw 'Operacao sintetica nao foi concluida/persistida.' }

  @{startedAt=(Get-Date).ToString('o');pids=@($backend.Id,$frontend.Id);backendPid=$backend.Id;frontendPid=$frontend.Id} |
    ConvertTo-Json -Depth 5 | Set-Content $PidFile -Encoding utf8
  [ordered]@{
    status='PASS';version='8.9.0';timestamp=(Get-Date).ToString('o')
    frontend='http://127.0.0.1:5173/';backend='http://127.0.0.1:3000/health'
    backendPid=$backend.Id;frontendPid=$frontend.Id
    health='PASS';proxy='PASS';state='PASS';metrics='PASS';websocket='PASS'
    queueSynthetic='PASS';tests=if($SkipTests){'NOT_RUN_IN_START'}else{'PASS'}
  } | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $Project 'VALIDATION-V8.json') -Encoding utf8

  Write-Banner 'SKYNET V8 LUCIFER ONLINE - VALIDADO' Green
  Write-Host 'Dashboard: http://127.0.0.1:5173/' -ForegroundColor Cyan
  Write-Host 'Backend  : http://127.0.0.1:3000/health' -ForegroundColor Cyan
  Write-Host 'WebSocket: ws://127.0.0.1:5173/ws' -ForegroundColor Cyan
  if (!$NoBrowser) { Start-Process 'http://127.0.0.1:5173/' }
}
catch {
  Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
  # Stop only the child processes started by this attempt.
  if ($frontend) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
  if ($backend) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
  throw
}
