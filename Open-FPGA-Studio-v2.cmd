@echo off
setlocal
pushd "%~dp0studio"
call npm run desktop
set "FPGA_STUDIO_EXIT=%ERRORLEVEL%"
popd
if not "%FPGA_STUDIO_EXIT%"=="0" (
  echo.
  echo FPGA Studio could not start. Read the first error above.
  pause
)
exit /b %FPGA_STUDIO_EXIT%
