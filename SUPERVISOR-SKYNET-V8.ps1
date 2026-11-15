#requires -Version 7.0
[CmdletBinding()]
param([int]$IntervalSeconds=5,[int]$MaxRestarts=5)
$ErrorActionPreference='Continue'
$Project=Split-Path -Parent $MyInvocation.MyCommand.Path
$restarts=0
Write-Host "SKYNET V8 LUCIFER supervisor iniciado. Ctrl+C para parar." -ForegroundColor Green
while($true){
  $ok=$false
  try{
    $h=Invoke-RestMethod 'http://127.0.0.1:5173/health' -NoProxy -TimeoutSec 3
    $ok=($h.ok -eq $true -and $h.service -eq 'skynet-v8-lucifer-core')
  }catch{}
  if(!$ok){
    $restarts++
    Write-Host "[$(Get-Date -Format HH:mm:ss)] health falhou; restart $restarts/$MaxRestarts" -ForegroundColor Yellow
    if($restarts -gt $MaxRestarts){throw 'Limite de reinicializações atingido.'}
    try{& (Join-Path $Project 'START-SKYNET-V8.ps1') -SkipTests}catch{Write-Host $_ -ForegroundColor Red}
  } else {
    $restarts=0
  }
  Start-Sleep -Seconds ([Math]::Max(2,$IntervalSeconds))
}
