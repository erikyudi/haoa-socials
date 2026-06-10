@echo off
REM MazyUI — Inicia o servidor local e abre o painel no navegador.
setlocal
cd /d "%~dp0"

echo.
echo  MazyUI
echo  ------

REM Checa Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERRO] Node.js nao encontrado.
  echo         Instale em https://nodejs.org e tente novamente.
  echo.
  pause
  exit /b 1
)

REM Verifica se a porta 7777 ja esta em uso
netstat -ano 2>nul | findstr "127.0.0.1:7777 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo  Servidor ja esta rodando.
  echo  Abrindo http://localhost:7777/
  echo.
  start "" "http://localhost:7777/"
  goto :keep_open
)

REM Porta ocupada mas servidor nao responde? Mata o processo travado.
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr "127.0.0.1:7777 " ^| findstr "LISTENING"') do (
  echo  Encerrando servidor anterior [PID %%p]...
  taskkill /PID %%p /F >nul 2>nul
  timeout /t 2 /nobreak >nul
)

REM Inicia o servidor em background, minimizado
echo  Iniciando servidor...
start "MazyUI Server" /min cmd /c "node start.mjs > MazyUI-server.log 2>&1"

REM Aguarda o servidor responder (max 60 segundos — primeira execucao instala dependencias)
set /a tries=0
:wait
set /a tries+=1
netstat -ano 2>nul | findstr "127.0.0.1:7777 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 goto :ready
if %tries% LSS 60 (
  timeout /t 1 /nobreak >nul
  goto wait
)

echo.
echo  [AVISO] Servidor nao respondeu em 60 segundos.
echo          Verifique se a porta 7777 esta disponivel.
echo          O processo "node MazyUI-server.mjs" pode estar com erro.
echo.
pause
exit /b 1

:ready
echo  Pronto! Abrindo http://localhost:7777/
echo.
start "" "http://localhost:7777/"

:keep_open
title MazyUI - RODANDO [http://localhost:7777/]
echo  [RODANDO] http://localhost:7777/ - Feche esta janela quando quiser.
timeout /t 60 /nobreak >nul
goto keep_open
