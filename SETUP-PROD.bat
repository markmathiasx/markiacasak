@echo off
setlocal
pushd "%~dp0" || exit /b 1
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto failed
call npm.cmd run test:all
if errorlevel 1 goto failed
call npm.cmd run lint
if errorlevel 1 goto failed
call npm.cmd run build
if errorlevel 1 goto failed
echo Setup concluido. Execute SKYNET-EXECUTABLE.bat.
popd
exit /b 0

:failed
set "setup_rc=%errorlevel%"
popd
exit /b %setup_rc%
