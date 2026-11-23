#requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateRange(1, 10000)]
    [int]$Rounds = 289,

    [ValidateRange(0, 4294967295)]
    [long]$Seed = 20261123
)

$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$scriptPath = Join-Path $projectDir 'CIDADE-COMPLETA-APOSTAS.cjs'

Write-Host 'SKYNET V8 LUCIFER - SIMULACAO LOCAL' -ForegroundColor Cyan
Write-Host 'Resultados sintéticos: nenhuma aposta real, conexão externa ou previsão.' -ForegroundColor Yellow

try {
    $node = Get-Command node.exe -ErrorAction Stop
    if (!(Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
        throw "Script de simulacao ausente: $scriptPath"
    }

    $versionText = & $node.Source -p 'process.versions.node'
    if ($LASTEXITCODE -ne 0) {
        throw 'Nao foi possivel consultar a versao do Node.js.'
    }
    $nodeVersion = [version]$versionText
    if ($nodeVersion -lt [version]'22.12') {
        throw "Node.js 22.12+ necessario; encontrado: $nodeVersion"
    }

    $runId = (Get-Date -Format 'yyyyMMdd-HHmmssfff') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
    $runDir = Join-Path $projectDir "logs\cidade-simulacao-$runId"
    $dataDir = Join-Path $runDir 'dados'
    $logFile = Join-Path $runDir 'execucao.log'
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

    Write-Host "[NODE] $($node.Source) ($nodeVersion)" -ForegroundColor Green
    Write-Host "[RODADAS] $Rounds | [SEMENTE] $Seed" -ForegroundColor Green
    Write-Host "[SAIDA] $runDir" -ForegroundColor Green

    Push-Location $projectDir
    try {
        & $node.Source --max-old-space-size=4096 $scriptPath `
            --rounds $Rounds --seed $Seed --output-dir $dataDir 2>&1 |
            Tee-Object -FilePath $logFile
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "Simulacao Node.js falhou (exit code $exitCode). Consulte $logFile"
    }

    $summaryPath = Join-Path $dataDir 'city-summary.json'
    if (!(Test-Path -LiteralPath $summaryPath -PathType Leaf)) {
        throw "Resumo da simulacao nao foi gerado: $summaryPath"
    }
    $summary = Get-Content -LiteralPath $summaryPath -Raw | ConvertFrom-Json
    if ($summary.scope -ne 'LOCAL_SYNTHETIC_ONLY' -or [int]$summary.roundNumber -ne $Rounds) {
        throw 'Resumo nao corresponde a uma simulacao local completa.'
    }

    Write-Host "`nSIMULACAO CONCLUIDA: $($summary.roundNumber) rodadas sintéticas." -ForegroundColor Green
    Write-Host "Resumo: $summaryPath" -ForegroundColor Cyan
    Write-Host "Log: $logFile" -ForegroundColor Cyan
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
