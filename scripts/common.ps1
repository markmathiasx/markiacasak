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

function Get-LocalPort([string]$Value,[int]$Default){
  if (!$Value) { return $Default }
  $parsed = 0
  if (![int]::TryParse($Value,[ref]$parsed) -or $parsed -lt 1 -or $parsed -gt 65535) {
    throw 'Porta local invalida.'
  }
  return $parsed
}

function Stop-ProjectProcesses([string]$Project){
  $pidFile=Join-Path $Project '.runtime\pids.json'
  $scripts = @('server.cjs','node_modules\vite\bin\vite.js') | ForEach-Object {
    [regex]::Escape((Join-Path $Project $_))
  }
  $pattern = '(?:^|[\s"])(?:' + ($scripts -join '|') + ')(?=["\s]|$)'
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -eq 'node.exe' -and $_.CommandLine -match $pattern
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 600
}

function Assert-PortFree([int]$Port,[string]$Project){
  $o=Get-PortOwner $Port
  if(!$o){return}
  throw "Porta $Port ocupada. PID=$($o.PID) Processo=$($o.Name). Verifique quem usa a porta antes de iniciar $Project."
}

function Resolve-ProjectChild([string]$Root,[string]$Relative) {
  if ([string]::IsNullOrWhiteSpace($Relative) -or [IO.Path]::IsPathRooted($Relative)) {
    throw 'O mapa deve conter caminhos relativos.'
  }
  $base = [IO.Path]::GetFullPath($Root).TrimEnd('\','/')
  $cursor = $base
  foreach ($part in ($Relative -split '[\\/]')) {
    if ($part -match '[. ]$' -or $part -eq '' -or $part.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0) {
      throw "Caminho invalido no mapa: $Relative"
    }
    $cursor = Join-Path $cursor $part
    $item = Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
      throw "Link no caminho de restauracao: $cursor"
    }
  }
  $cursor
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
