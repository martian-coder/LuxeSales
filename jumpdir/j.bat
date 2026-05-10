@echo off
setlocal
for /f "delims=" %%i in ('python "%~dp0jumpdir.py" --pick %* 2^>nul') do set JUMPDIR_RESULT=%%i
endlocal & set JUMPDIR_RESULT=%JUMPDIR_RESULT%
if defined JUMPDIR_RESULT (
    python "%~dp0jumpdir.py" --add "%JUMPDIR_RESULT%" 2>nul
    cd /d "%JUMPDIR_RESULT%"
)
