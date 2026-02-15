@echo off
echo Starting Finance & Debt Manager...
start http://localhost:8080/
powershell -ExecutionPolicy Bypass -File server.ps1
pause
