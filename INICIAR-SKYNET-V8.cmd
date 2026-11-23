@echo off
setlocal
cd /d "%~dp0" || exit /b 1

where node.exe >nul 2>nul || (
  echo Node.js nao foi encontrado no PATH.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul || (
  echo npm nao foi encontrado no PATH.
  pause
  exit /b 1
)
if not exist "server.cjs" (
  echo server.cjs nao foi encontrado nesta pasta.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencias ausentes. Execute npm install nesta pasta e tente novamente.
  pause
  exit /b 1
)
if not exist "node_modules\express\package.json" (
  echo Dependencias ausentes. Execute npm install nesta pasta e tente novamente.
  pause
  exit /b 1
)
if not exist "node_modules\ws\package.json" (
  echo Dependencias ausentes. Execute npm install nesta pasta e tente novamente.
  pause
  exit /b 1
)

set "HEALTH=http://127.0.0.1:5173/health"
set "LAB_SESSION=http://127.0.0.1:5173/api/scenario-lab/session"
set "DASHBOARD=http://127.0.0.1:5173/?validated=20260908-155006"
curl.exe -fsS --max-time 2 "%HEALTH%" 2>nul | findstr /C:"skynet-v8-lucifer-core" >nul
if not errorlevel 1 (
  curl.exe -fsS --max-time 2 -X POST -H "Content-Type: application/json" -d "{}" "%LAB_SESSION%" 2>nul | findstr /C:"LOCAL_SYNTHETIC_ONLY" >nul
  if not errorlevel 1 goto open_dashboard
  echo O Node atual ainda nao carregou as rotas do Laboratorio A/B/C.
  echo Encerre a janela antiga do Node com Ctrl+C e execute este iniciador novamente.
  pause
  exit /b 1
)

pwsh.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }" >nul 2>nul
if errorlevel 1 (
  echo A porta 5173 ja esta ocupada por um servico que nao foi validado como SKYNET.
  echo Feche esse servico ou verifique a porta antes de iniciar.
  pause
  exit /b 1
)

start "SKYNET V8 - Servicos" /D "%~dp0" cmd /k "npm run dev"
for /L %%I in (1,1,45) do (
  curl.exe -fsS --max-time 2 "%HEALTH%" 2>nul | findstr /C:"skynet-v8-lucifer-core" >nul
  if not errorlevel 1 (
    curl.exe -fsS --max-time 2 -X POST -H "Content-Type: application/json" -d "{}" "%LAB_SESSION%" 2>nul | findstr /C:"LOCAL_SYNTHETIC_ONLY" >nul
    if not errorlevel 1 goto open_dashboard
  )
  timeout /t 1 /nobreak >nul
)

echo O SKYNET nao respondeu na porta 5173. Verifique a janela dos servicos para ver o erro.
pause
exit /b 1

:open_dashboard
start "" "%DASHBOARD%"
echo SKYNET ativo: %DASHBOARD%
exit /b 0
