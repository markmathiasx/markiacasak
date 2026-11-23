@echo off
setlocal
pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0START-SKYNET-V8.ps1" %*
exit /b %errorlevel%
