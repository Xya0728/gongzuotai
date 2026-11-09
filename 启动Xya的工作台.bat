@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Python，请先安装 Python 3 后再双击本文件。
  pause
  exit /b 1
)
python server.py
pause
