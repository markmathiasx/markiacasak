# MOBA v1.0 - Script de Criação Automática
# Executar: .\create_project.ps1

$projectRoot = "C:\Users\markkk\Downloads\SKYNET-V8-LUCIFER-v8.9.0"
$projectName = "SkyNetMOBA-v1"

Write-Host "`n[SKYNET] Criando estrutura do projeto MOBA v1.0..." -ForegroundColor Cyan

# Verifica pasta raiz
if (-not (Test-Path $projectRoot)) {
    Write-Host "[ERRO] Pasta `$projectRoot não existe. Criando..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $projectRoot | Out-Null
}

$dir = Get-ChildItem -Path $projectRoot -Directory | Where-Object { $_.Name -eq "SKYNET-v8-lucifer" }
if ($null -eq $dir) {
    Write-Host "[ERRO] Não encontrou diretório SKYNET... preparando estrutura..." -ForegroundColor Yellow
}

# Cria estrutura de pastas completa
$directories = @(
    "$projectRoot",
    "$projectRoot\project.godot",
    "$projectRoot\scenes",
    "$projectRoot\scripts",
    "$projectRoot\resources",
    "$projectRoot\assets",
    "$projectRoot\builds"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "`n[SKYNET] Estrutura criada!" -ForegroundColor Green
Write-Host "Diretório: `$projectRoot" -ForegroundColor Gray
Write-Host "Próximo passo: Instalar Godot 4.x antes de importar o projeto" -ForegroundColor Yellow