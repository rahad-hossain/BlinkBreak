@echo off
rem Builds native\bin\BlinkTaskbar.dll with the Visual Studio x64 C++ toolchain.
setlocal
for /f "usebackq delims=" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set VSDIR=%%i
call "%VSDIR%\VC\Auxiliary\Build\vcvars64.bat" >nul || exit /b 1

cd /d "%~dp0"
if not exist ..\bin mkdir ..\bin
if not exist build mkdir build

cl /nologo /LD /O2 /MT /std:c++20 /EHsc /permissive- /bigobj /W3 /utf-8 ^
   /DUNICODE /D_UNICODE /DWIN32_LEAN_AND_MEAN /DNOMINMAX ^
   BlinkTaskbar.cpp /Fobuild\ /Fe..\bin\BlinkTaskbar.dll ^
   /link /DEF:BlinkTaskbar.def windowsapp.lib ole32.lib oleaut32.lib user32.lib advapi32.lib dxguid.lib
