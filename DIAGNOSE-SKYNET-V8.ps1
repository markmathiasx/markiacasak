#requires -Version 7.0
$Project=Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Project 'scripts\common.ps1')
$Stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$Out=Join-Path $Project "diagnostics\$Stamp"
New-Item -ItemType Directory -Force -Path $Out|Out-Null

$r=[ordered]@{timestamp=(Get-Date).ToString('o');project=$Project;node=$null;npm=$null;ports=@();health=@{}}
if(Get-Command node -ErrorAction SilentlyContinue){$r.node=(node --version)}
if(Get-Command npm -ErrorAction SilentlyContinue){$r.npm=(npm --version)}
foreach($p in 3000,5173){$o=Get-PortOwner $p;$r.ports+=if($o){$o}else{[pscustomobject]@{Port=$p;Free=$true}}}
foreach($u in 'http://127.0.0.1:3000/health','http://127.0.0.1:5173/','http://127.0.0.1:5173/health'){
  try{$x=Invoke-WebRequest $u -UseBasicParsing -NoProxy -TimeoutSec 4;$r.health[$u]=@{ok=$true;status=$x.StatusCode;type=$x.Headers['Content-Type'];preview=$x.Content.Substring(0,[Math]::Min(180,$x.Content.Length))}}
  catch{$r.health[$u]=@{ok=$false;error=$_.Exception.Message}}
}
$r|ConvertTo-Json -Depth 10|Set-Content (Join-Path $Out 'report.json') -Encoding UTF8
foreach($f in Get-ChildItem (Join-Path $Project 'logs') -File -ErrorAction SilentlyContinue){Copy-Item $f.FullName $Out -Force}
$r|ConvertTo-Json -Depth 10
Write-Host "Diagnóstico: $Out" -ForegroundColor Green
