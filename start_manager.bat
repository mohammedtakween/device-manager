@echo off
echo Starting the server and opening the browser...
start "My Server" cmd /k "npm start"
start http://localhost:3000