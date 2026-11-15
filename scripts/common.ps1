$script:ProjectDefault = 'C:\Users\markkk\Documents\aaa\skynet-dashboard'

function Write-Banner([string]$Text,[ConsoleColor]$Color='Cyan'){
  Write-Host "`n================================================================" -ForegroundColor $Color
  Write-Host " $Text" -ForegroundColor $Color
  Write-Host "================================================================" -ForegroundColor $Color
}

function Get-PortOwner([int]$Port){
  $c=Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1
  if(!$c){return $null}
  $p=Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" -ErrorAction SilentlyContinue
  [pscustomobject]@{Port=$Port;PID=$c.OwningProcess;Name=$p.Name;CommandLine=$p.CommandLine}
}

function Stop-ProjectProcesses([string]$Project){
  $pidFile=Join-Path $Project '.runtime\pids.json'
  $known=@()
  if(Test-Path $pidFile){
    try{$x=Get-Content $pidFile -Raw|ConvertFrom-Json;$known=@($x.pids)}catch{}
  }
  $portPids=@(foreach($port in @(3000,5173)){
    $owner=Get-PortOwner $port
    if($owner){[int]$owner.PID}
  })
  $escaped=[regex]::Escape($Project)
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -eq 'node.exe' -and (
        ($_.CommandLine -and $_.CommandLine -match $escaped) -or
        (($known -contains $_.ProcessId) -and ($portPids -contains $_.ProcessId))
      )
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 600
}

function Assert-PortFree([int]$Port,[string]$Project){
  $o=Get-PortOwner $Port
  if(!$o){return}
  if($o.CommandLine -and $o.CommandLine.Contains($Project,[StringComparison]::OrdinalIgnoreCase)){
    Stop-Process -Id $o.PID -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    if(!(Get-PortOwner $Port)){return}
  }
  throw "Porta $Port ocupada por outro processo. PID=$($o.PID) NAME=$($o.Name) CMD=$($o.CommandLine)"
}

function Wait-Json([string]$Url,[int]$Seconds=45,[int]$ExpectedPid=0){
  $end=(Get-Date).AddSeconds($Seconds)
  do{
    try{
      $r=Invoke-RestMethod $Url -NoProxy -TimeoutSec 3 -ErrorAction Stop
      if($r.ok -eq $true){
        if($ExpectedPid -gt 0 -and $r.pid -and [int]$r.pid -ne $ExpectedPid){return $null}
        return $r
      }
    }catch{}
    Start-Sleep -Milliseconds 500
  }while((Get-Date)-lt$end)
  return $null
}

function Wait-Http([string]$Url,[int]$Seconds=45){
  $end=(Get-Date).AddSeconds($Seconds)
  do{
    try{$r=Invoke-WebRequest $Url -UseBasicParsing -NoProxy -TimeoutSec 3;if($r.StatusCode -eq 200){return $true}}catch{}
    Start-Sleep -Milliseconds 500
  }while((Get-Date)-lt$end)
  return $false
}
