@echo off
cd /d "%~dp0"
copy /b project.part01+project.part02+project.part03+project.part04 cognition-editable-project.zip
if errorlevel 1 goto error
echo Complete: cognition-editable-project.zip
certutil -hashfile cognition-editable-project.zip SHA256
echo Expected: 5b25d7b1429cae25460d0e2789c7fbf46365aac48d4611c2429b38f1b2300faa
pause
exit /b 0
:error
echo Restore failed. Please download the complete bundle again.
pause
exit /b 1
