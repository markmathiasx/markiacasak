#requires -Version 7.0
<#
  SKYNET V8.9.0 - reparacao e validacao do codigo local.
  Requer Windows + PowerShell 7, Node.js e npm.
  Uso com ZIP corrigido na mesma pasta:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\CURA-DEFINITIVA-SKYNET.ps1
  Opcional: -Target 'C:\...\SKYNET-V8-LUCIFER-v8.9.0' -NoBrowser
  Nao acessa sites de cassino nem altera resultados de jogos.
#>
[CmdletBinding()]
param(
  [string]$Target = 'C:\Users\markkk\Documents\aaa\skynet-dashboard\SKYNET-V8-LUCIFER-v8.9.0',
  [string]$Archive = (Join-Path $PSScriptRoot 'SKYNET-V8-LUCIFER-v8.9.0-CORRIGIDO.zip'),
  [string]$SourceFolder = '',
  [switch]$NoBrowser,
  [switch]$NoStart,
  [switch]$ForceInstall
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'

function Status([string]$Message) { Write-Host ("[CURA V8] " + $Message) -ForegroundColor Cyan }
function Must([bool]$Condition,[string]$Message) { if (!$Condition) { throw $Message } }
function NativeStep([string]$Name,[string]$Executable,[string[]]$Arguments) {
  Status $Name
  & $Executable @Arguments
  $rc=$LASTEXITCODE
  if ($rc -ne 0) { throw "$Name falhou (exit code $rc)." }
}
function Port-Owner([int]$Port) {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}
function Stop-OnlyThisProject([string]$Root) {
  $all = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  $candidateIds = @()
  $file = Join-Path $Root '.runtime\pids.json'
  if (Test-Path -LiteralPath $file) {
    try { $obj=Get-Content $file -Raw | ConvertFrom-Json; $candidateIds=@($obj.pids) } catch {}
  }
  $listeningIds = @(3000,5173 | ForEach-Object { $owner=Port-Owner $_; if ($owner) { [int]$owner.OwningProcess } })
  foreach ($p in $all) {
    if ($p.Name -ne 'node.exe' -and $p.Name -ne 'cmd.exe') { continue }
    $matched = $p.CommandLine -and $p.CommandLine.Contains($Root,[StringComparison]::OrdinalIgnoreCase)
    $registered = ($candidateIds -contains $p.ProcessId) -and ($listeningIds -contains [int]$p.ProcessId)
    if ($matched -or $registered) {
      Status "Parando processo do projeto PID $($p.ProcessId)"
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
  if (Test-Path -LiteralPath $file) { Remove-Item $file -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 650
  foreach ($port in @(3000,5173)) {
    $owner=Port-Owner $port
    if ($owner) { throw "Porta $port ainda ocupada (PID $($owner.OwningProcess)). Nao encerrei processos alheios." }
  }
}

$TempFolder=$null
$Backup=$null
$AppliedFiles=New-Object System.Collections.Generic.List[string]
$CreatedFiles=New-Object System.Collections.Generic.List[string]
$Phase='PREFLIGHT'
$Success=$false
$TranscriptStarted=$false
try {
  Must (Test-Path -LiteralPath $Target -PathType Container) "Projeto nao encontrado: $Target"
  $Target=(Resolve-Path -LiteralPath $Target).Path
  Must (Test-Path -LiteralPath (Join-Path $Target 'package.json') -PathType Leaf) 'Pasta sem package.json; indique a raiz correta no parametro -Target.'
  $null=Get-Command node -ErrorAction Stop
  $null=Get-Command npm.cmd -ErrorAction Stop
  $null=Get-Command Get-NetTCPConnection -ErrorAction Stop
  $nodeVersion=& node -p 'process.versions.node'
  Must ($LASTEXITCODE -eq 0) 'Nao foi possivel consultar a versao do Node.'
  $v=[version]$nodeVersion
  Must ($v.Major -ge 22 -and ($v.Major -gt 22 -or $v.Minor -ge 12)) 'Node.js 22.12+ necessario para este kit (24.x recomendado).'
  Status "Node.js $nodeVersion | Alvo: $Target"

  $Source = $null
  if ($SourceFolder) {
    Must (Test-Path -LiteralPath $SourceFolder -PathType Container) "Fonte ausente: $SourceFolder"
    $Source = (Resolve-Path -LiteralPath $SourceFolder).Path
  } else {
    Must (Test-Path -LiteralPath $Archive -PathType Leaf) "ZIP corrigido ausente: $Archive"
    $TempFolder=Join-Path ([IO.Path]::GetTempPath()) ('SKYNET-CURA-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $TempFolder | Out-Null
    Expand-Archive -LiteralPath $Archive -DestinationPath $TempFolder -Force
    $Source=Join-Path $TempFolder 'SKYNET-V8-LUCIFER-v8.9.0'
  }
  Must (Test-Path -LiteralPath (Join-Path $Source 'MANIFEST.json')) 'MANIFEST.json ausente no pacote.'
  Must ((Get-Content (Join-Path $Source 'package.json') -Raw | ConvertFrom-Json).version -eq '8.9.0') 'Versao de origem inesperada.'
  $manifest=Get-Content (Join-Path $Source 'MANIFEST.json') -Raw | ConvertFrom-Json
  Must ($manifest.version -eq '8.9.0') 'Versao do manifesto inesperada.'
  $items=@($manifest.files)
  Must ($items.Count -ge 40) 'Manifesto incompleto.'
  foreach ($item in $items) {
    $relative=[string]$item.path
    Must ($relative -notmatch '(^|[\\/])\.\.([\\/]|$)|^[\\/]|:') "Caminho inseguro no manifesto: $relative"
    $src=Join-Path $Source $relative
    Must (Test-Path -LiteralPath $src -PathType Leaf) "Arquivo ausente: $relative"
    Must ((Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash.ToLowerInvariant() -eq [string]$item.sha256) "Hash SHA-256 invalido: $relative"
  }
  Status "Pacote 8.9.0 verificado: $($items.Count) hashes SHA-256 conferidos."

  $Stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
  $Backup=Join-Path $Target "backups\cura-definitiva-$Stamp"
  New-Item -ItemType Directory -Force -Path $Backup | Out-Null
  $diag=Join-Path $Target 'diagnostics'
  New-Item -ItemType Directory -Force -Path $diag | Out-Null
  $log=Join-Path $diag "cura-$Stamp.log"
  try { Start-Transcript -Path $log -ErrorAction Stop | Out-Null; $TranscriptStarted=$true } catch { Status "Transcricao nao disponivel: $($_.Exception.Message)" }
  Status "Backup antes da alteracao: $Backup"

  $Phase='APPLY'
  Stop-OnlyThisProject $Target
  $sourceCanon=[IO.Path]::GetFullPath($Source).TrimEnd('\','/')
  $targetCanon=[IO.Path]::GetFullPath($Target).TrimEnd('\','/')
  foreach ($item in $items) {
    $relative=[string]$item.path
    $src=Join-Path $Source $relative
    $dst=Join-Path $Target $relative
    if ($sourceCanon.Equals($targetCanon,[StringComparison]::OrdinalIgnoreCase)) { continue }
    if (Test-Path -LiteralPath $dst) {
      $save=Join-Path $Backup $relative
      New-Item -ItemType Directory -Force -Path (Split-Path $save -Parent) | Out-Null
      Copy-Item -LiteralPath $dst -Destination $save -Force
      $AppliedFiles.Add($relative)
    } else { $CreatedFiles.Add($relative) }
    New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
  }
  if (!$sourceCanon.Equals($targetCanon,[StringComparison]::OrdinalIgnoreCase)) {
    # Manifest itself is not self-hashed.
    $dst=Join-Path $Target 'MANIFEST.json'
    if (Test-Path $dst) {Copy-Item $dst (Join-Path $Backup 'MANIFEST.json') -Force; $AppliedFiles.Add('MANIFEST.json')}
    else {$CreatedFiles.Add('MANIFEST.json')}
    Copy-Item (Join-Path $Source 'MANIFEST.json') $dst -Force
  }
  $restoreInfo=[ordered]@{timestamp=(Get-Date).ToString('o');target=$Target;updated=@($AppliedFiles.ToArray());created=@($CreatedFiles.ToArray())}
  $restoreInfo | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $Backup 'restore-map.json') -Encoding utf8
  Set-Location $Target

  $Phase='TEST'
  if ($ForceInstall) { $needsInstall=$true }
  else {
    & npm.cmd ls --depth=0 *> $null
    $needsInstall=($LASTEXITCODE -ne 0)
  }
  if ($needsInstall) { NativeStep 'Instalacao das dependencias (npm ci)' 'npm.cmd' @('ci','--no-audit','--no-fund') }
  else { Status 'Dependencias existentes validadas com npm ls; sem reinstalacao desnecessaria.' }
  NativeStep 'Sintaxe do servidor' 'node' @('--check','.\server.cjs')
  NativeStep 'Sintaxe do teste atualizado' 'node' @('--check','.\tests.cjs')
  NativeStep 'Suites completas e build de producao' 'npm.cmd' @('test')

  if (!$NoStart) {
    $Phase='START'
    Status 'Inicializando e verificando frontend, backend, WebSocket, proxy e operacao local...'
    & (Join-Path $Target 'START-SKYNET-V8.ps1') -SkipTests -NoBrowser:$NoBrowser
    Must (Test-Path -LiteralPath (Join-Path $Target 'VALIDATION-V8.json')) 'Arquivo de validacao nao gerado.'
    $result=Get-Content (Join-Path $Target 'VALIDATION-V8.json') -Raw | ConvertFrom-Json
    Must ($result.status -eq 'PASS' -and $result.websocket -eq 'PASS' -and $result.queueSynthetic -eq 'PASS') 'Validacao de inicializacao incompleta.'
  }
  $Phase='DONE'
  $Success=$true
  Status '[PASS] Reparacao e validacoes concluidas.'
  if (!$NoStart) { Write-Host 'Dashboard: http://127.0.0.1:5173/' -ForegroundColor Green }
  Write-Host "Backup de retorno: $Backup" -ForegroundColor Green
  if ($NoStart) { Write-Host 'O parametro -NoStart impediu verificacao de servicos ao vivo.' -ForegroundColor Yellow }
}
catch {
  $reason=$_.Exception.Message
  Write-Host "[FALHA] Etapa $Phase : $reason" -ForegroundColor Red
  if ($Backup -and (Test-Path -LiteralPath $Backup) -and $Phase -ne 'PREFLIGHT') {
    try {
      Stop-OnlyThisProject $Target
      foreach ($relative in $CreatedFiles) { Remove-Item -LiteralPath (Join-Path $Target $relative) -Force -ErrorAction SilentlyContinue }
      foreach ($relative in $AppliedFiles) {
        $copy=Join-Path $Backup $relative
        if (Test-Path -LiteralPath $copy -PathType Leaf) {
          $dst=Join-Path $Target $relative
          New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
          Copy-Item -LiteralPath $copy -Destination $dst -Force
        }
      }
      Write-Host "[ROLLBACK] Arquivos anteriores restaurados de $Backup" -ForegroundColor Yellow
      Write-Host 'Observacao: npm ci pode ter alterado node_modules; este backup nao inclui dependencias.' -ForegroundColor Yellow
    } catch { Write-Host "[ROLLBACK INCOMPLETO] $($_.Exception.Message)" -ForegroundColor Red }
  }
  throw
}
finally {
  if ($TranscriptStarted) {try {Stop-Transcript | Out-Null} catch {}}
  if ($TempFolder -and (Test-Path -LiteralPath $TempFolder)) {Remove-Item -LiteralPath $TempFolder -Recurse -Force -ErrorAction SilentlyContinue}
}
